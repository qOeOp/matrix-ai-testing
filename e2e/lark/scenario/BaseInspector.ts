import {Page} from 'playwright';
import {TestStateManager} from '../shared/TestStateManager';
import {StepStatus} from '../types/TestResult';
import {StepRegistry} from '../registry/StepRegistry';
import {createModuleLogger} from '../shared/Logger';

const logger = createModuleLogger('BaseInspector');

/**
 * 步骤构建器 - 提供流畅的步骤定义和执行API
 */
class StepBuilder {
    constructor(
        private inspector: BaseInspector,
        private stepIndex: number
    ) {}

    /**
     * 执行步骤
     */
    async run<T = void>(implementation: () => Promise<T>): Promise<T> {
        return await this.inspector.executeStepInternal(this.stepIndex, implementation);
    }
}

/**
 * 巡检基类 - 提供公共的步骤管理和截图功能
 */
export abstract class BaseInspector {
    protected stateManager: TestStateManager;
    protected stepRegistry: StepRegistry;
    private currentTaskId: string | null = null;
    private currentMethodName: string | null = null; // 当前执行的方法名
    protected agentForPage: ((page: Page) => any) | null = null; // 存储agentForPage函数
    protected menu: any = null; // 存储menu实例
    protected page: Page | null = null; // 存储page实例

    constructor() {
        logger.info(`构造函数被调用: ${this.constructor.name}`);
        this.stateManager = TestStateManager.getInstance();
        this.stepRegistry = new StepRegistry();
        
        // 注册全局登录步骤（step 0）
        this.stepRegistry.registerGlobalStep(0, {name: '登录系统', order: 0});
        logger.info('已注册全局登录步骤: step_0');
    }





    /**
     * 获取step注册中心
     */
    getStepRegistry(): StepRegistry {
        return this.stepRegistry;
    }

    /**
     * 获取指定方法的步骤数量（包含全局登录步骤）
     * 步骤数 = 1（全局登录 step 0） + steps.length
     */
    getMethodStepCount(methodName: string): number {
        const constructor = this.constructor;
        const methods = Reflect.getMetadata('inspector:methods', constructor) || [];
        const method = methods.find((m: any) => m.methodName === methodName);
        
        if (!method || !method.steps) {
            return 1; // 只有登录步骤
        }
        
        // 登录步骤(1) + 方法的步骤数
        return 1 + Object.keys(method.steps).length;
    }



    /**
     * 设置当前任务ID（用于步骤执行）
     */
    setCurrentTaskId(taskId: string): void {
        this.currentTaskId = taskId;
    }

    /**
     * 设置当前执行的方法名
     */
    setCurrentMethodName(methodName: string): void {
        this.currentMethodName = methodName;
    }

    /**
     * 设置AgentForPage函数
     */
    setAgentForPage(agentForPage: (page: Page) => any): void {
        this.agentForPage = agentForPage;
    }

    /**
     * 设置Menu实例
     */
    setMenu(menu: any): void {
        this.menu = menu;
    }

    /**
     * 设置Page实例
     */
    setPage(page: Page): void {
        this.page = page;
    }

    /**
     * 获取步骤构建器（用于执行步骤）
     * @param stepIndex - 步骤索引（数字，0=登录，1-N=方法步骤）
     */
    protected step(stepIndex: number): StepBuilder {
        return new StepBuilder(this, stepIndex);
    }

    /**
     * 执行步骤的内部方法
     */
    async executeStepInternal<T>(
        stepIndex: number,
        implementation: () => Promise<T>
    ): Promise<T> {
        if (!this.currentTaskId) {
            throw new Error('TaskId not set. Call setCurrentTaskId() first.');
        }

        if (!this.page) {
            throw new Error('Page not set. Call setPage() first.');
        }

        // 直接从元数据读取步骤名称，不依赖StepRegistry
        const stepName = this.getStepNameFromMetadata(stepIndex);
        
        logger.debug(`执行步骤 ${stepIndex}: ${stepName}`);

        // 添加步骤到状态管理器
        const stepIdx = await this.addStep(this.currentTaskId, stepName);

        try {
            // 执行实现并获取返回值
            const result = await implementation();
            await this.completeStep(this.currentTaskId, stepIdx, this.page);
            return result;
        } catch (error: any) {
            // 保留完整的错误信息（包括堆栈）
            const fullError = error.stack || error.message || String(error);
            await this.failStep(this.currentTaskId, stepIdx, this.page, fullError);
            throw error;
        }
    }

    /**
     * 从元数据读取步骤名称
     */
    private getStepNameFromMetadata(stepIndex: number): string {
        // step 0 是全局登录步骤
        if (stepIndex === 0) {
            return '登录系统';
        }

        // 从元数据读取方法步骤
        const constructor = this.constructor;
        const methods = Reflect.getMetadata('inspector:methods', constructor) || [];
        const method = methods.find((m: any) => m.methodName === this.currentMethodName);

        if (method && method.steps && method.steps[stepIndex]) {
            return method.steps[stepIndex];
        }

        // 如果找不到，返回默认名称
        return `步骤 ${stepIndex}`;
    }

    /**
     * 添加巡检步骤
     */
    protected async addStep(taskId: string, stepName: string): Promise<number> {
        const test = this.stateManager.getTest(taskId);
        const stepIndex = test?.steps.length || 0;

        this.stateManager.addStep(taskId, {
            name: stepName,
            status: StepStatus.RUNNING,
            startTime: new Date()
        });

        return stepIndex;
    }

    /**
     * 完成步骤（成功）
     */
    protected async completeStep(taskId: string, stepIndex: number, page: Page): Promise<void> {
        await this.updateStepWithScreenshot(taskId, stepIndex, page, StepStatus.SUCCESS);
    }

    /**
     * 失败步骤
     */
    protected async failStep(taskId: string, stepIndex: number, page: Page, error: string): Promise<void> {
        await this.updateStepWithScreenshot(taskId, stepIndex, page, StepStatus.FAILED, error);
    }

    /**
     * 更新步骤状态并截图（核心方法）
     */
    private async updateStepWithScreenshot(
        taskId: string,
        stepIndex: number,
        page: Page,
        status: StepStatus.SUCCESS | StepStatus.FAILED,
        error?: string
    ): Promise<void> {
        const test = this.stateManager.getTest(taskId);
        if (!test) return;

        const step = test.steps[stepIndex];
        const duration = Date.now() - (step.startTime?.getTime() || Date.now());

        // 截图
        const screenshot = await page.screenshot({fullPage: true});
        const base64 = `data:image/png;base64,${screenshot.toString('base64')}`;

        this.stateManager.updateStep(taskId, stepIndex, {
            status,
            duration,
            screenshot: base64,
            ...(error && {error})
        });
    }
}
