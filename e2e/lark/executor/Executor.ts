import 'reflect-metadata';
import {Browser, chromium, Page} from 'playwright';
import {StepStatus, TestStatus} from '../types/TestResult';
import {LoginPage} from '../../pages/LoginPage';
import {PlaywrightAgent} from '@midscene/web';
import {LLMSpectatorDispatcher} from '../dispatcher/Dispatcher';
import {registerAllInspectors} from '../scenario';
import {BaseInspector} from '../scenario/BaseInspector';
import {createModuleLogger} from '../shared/Logger';

const logger = createModuleLogger('Executor');

/**
 * 页面巡检器 - 负责调度和执行巡检任务
 */
export class PageInspector extends BaseInspector {
    private dispatcher: LLMSpectatorDispatcher;

    constructor() {
        super(); // 调用基类构造函数初始化 stateManager
        this.dispatcher = new LLMSpectatorDispatcher();

        // 启动时自动注册所有巡检
        registerAllInspectors();
    }

    /**
     * 根据用户消息解析并执行对应的巡检
     */
    async executeInspection(taskId: string, userMessage: string): Promise<void> {
        try {

            // 1. 使用 LLM 解析用户消息，生成巡检执行计划
            const inspectionPlan = await this.dispatcher.parseUserMessage(userMessage);

            if (!inspectionPlan) {
                const errorMsg = `无法解析用户消息: ${userMessage}。请确保消息包含有效的巡检关键词（如“固收”、“资金”等）。`;
                logger.error(errorMsg);
                // 创建测试状态并标记失败
                this.stateManager.createTest(taskId, userMessage);
                this.stateManager.completeTest(taskId, TestStatus.FAILED);
                return;
            }

            logger.info('巡检执行计划:');
            logger.info(`巡检类: ${inspectionPlan.inspectorClass.classConfig.name}`);
            logger.info(`巡检方法: ${inspectionPlan.methods.map(m => m.name).join(', ')}`);

            // 获取inspector实例
            const inspectorInstance = inspectionPlan.inspectorClass.classInstance;

            // 2. 为每个方法创建独立的浏览器实例并执行
            for (let i = 0; i < inspectionPlan.methods.length; i++) {
                const method = inspectionPlan.methods[i];
                
                // 为每个方法创建独立的taskId
                const methodTaskId = `${taskId}_method_${i}`;
                
                // 计算该方法的步骤数：1（登录） + steps.length
                const totalSteps = inspectorInstance.getMethodStepCount(method.methodName);
                
                logger.info(`正在执行: ${method.name} [步骤数: ${totalSteps}]`);
                
                // 创建测试状态（每个方法独立的任务）
                this.stateManager.createTest(methodTaskId, method.name, totalSteps);
                
                // 为每个方法创建独立的浏览器实例
                let browser: Browser | null = null;
                
                try {
                    // 启动独立的浏览器实例
                    browser = await chromium.launch({headless: false});
                    const context = await browser.newContext();
                    const page = await context.newPage();
                    
                    logger.debug(`为 ${method.name} 创建了独立的浏览器实例`);
                    
                    // 创建 agentForPage 函数
                    const agentForPage = (page: Page) => new PlaywrightAgent(page,
                        {waitForNetworkIdleTimeout: 0, waitForNavigationTimeout: 0}
                    );
                    
                    // 设置当前任务ID、方法名和页面
                    inspectorInstance.setCurrentTaskId(methodTaskId);
                    inspectorInstance.setCurrentMethodName(method.methodName);
                    inspectorInstance.setAgentForPage(agentForPage);
                    inspectorInstance.setPage(page);
                    
                    // 每个方法都执行登录步骤（step 0）
                    await inspectorInstance.step(0).run(async () => {
                        const loginPage = new LoginPage(page, agentForPage);
                        const menu = await loginPage.login("test_xiaoshenyang", "123456");
                        inspectorInstance.setMenu(menu);
                        logger.debug(`${method.name} - 登录完成`);
                    });
                    
                    // 执行方法
                    await inspectorInstance[method.methodName]();
                    
                    // 标记任务完成
                    this.stateManager.completeTest(methodTaskId, TestStatus.COMPLETED);
                    
                } catch (error: any) {
                    logger.error(`${method.name} 执行失败: ${error.message}`, {error});
                    
                    // 标记任务失败
                    this.stateManager.completeTest(methodTaskId, TestStatus.FAILED);
                    
                    // 添加错误信息
                    const test = this.stateManager.getTest(methodTaskId);
                    if (test && test.steps.length > 0) {
                        const lastStepIndex = test.steps.length - 1;
                        this.stateManager.updateStep(methodTaskId, lastStepIndex, {
                            status: StepStatus.FAILED,
                            error: error.stack || error.message || '测试执行失败'
                        });
                    }
                } finally {
                    // 关闭该方法的浏览器实例
                    if (browser) {
                        await browser.close();
                        logger.debug(`已关闭 ${method.name} 的浏览器实例`);
                    }
                }
            }

        } catch (error: any) {
            logger.error(`测试执行失败: ${error.message}`, {error});
            throw error;
        }
    }
}
