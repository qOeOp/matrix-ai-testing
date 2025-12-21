import {TestResult, TestStatus, TestStep, TestMethodInfo} from '../types/TestResult';
import {EventEmitter} from 'events';

/**
 * 测试状态管理器 - 共享内存，用于测试用例和 Server 之间同步状态
 */
export class TestStateManager extends EventEmitter {
    private static instance: TestStateManager;
    private activeTests: Map<string, TestResult> = new Map();

    private constructor() {
        super();
    }

    static getInstance(): TestStateManager {
        if (!TestStateManager.instance) {
            TestStateManager.instance = new TestStateManager();
        }
        return TestStateManager.instance;
    }

    /**
     * 创建新的测试任务
     */
    createTest(taskId: string, userMessage: string, totalSteps?: number, testMethods?: TestMethodInfo[]): TestResult {
        const testResult: TestResult = {
            status: TestStatus.PROCESSING,
            userMessage,
            steps: [],
            startTime: new Date(),
            totalSteps, // 总步骤数
            testMethods, // 测试方法列表
            currentMethodIndex: 0 // 初始为第一个方法
        };

        this.activeTests.set(taskId, testResult);
        this.emit('test:created', taskId, testResult);
        return testResult;
    }

    /**
     * 更新当前正在执行的测试方法索引
     */
    updateCurrentMethodIndex(taskId: string, methodIndex: number): void {
        const test = this.activeTests.get(taskId);
        if (!test) {
            throw new Error(`Test ${taskId} not found`);
        }

        test.currentMethodIndex = methodIndex;
        this.emit('test:method:updated', taskId, methodIndex, test);
    }

    /**
     * 获取测试状态
     */
    getTest(taskId: string): TestResult | undefined {
        return this.activeTests.get(taskId);
    }

    /**
     * 添加测试步骤
     */
    addStep(taskId: string, step: TestStep): void {
        const test = this.activeTests.get(taskId);
        if (!test) {
            throw new Error(`Test ${taskId} not found`);
        }

        test.steps.push(step);
        this.emit('test:step:added', taskId, step, test);
    }

    /**
     * 更新测试步骤
     */
    updateStep(taskId: string, stepIndex: number, updates: Partial<TestStep>): void {
        const test = this.activeTests.get(taskId);
        if (!test || !test.steps[stepIndex]) {
            throw new Error(`Test ${taskId} or step ${stepIndex} not found`);
        }

        test.steps[stepIndex] = {...test.steps[stepIndex], ...updates};
        this.emit('test:step:updated', taskId, stepIndex, test.steps[stepIndex], test);
    }

    /**
     * 完成测试
     */
    completeTest(taskId: string, status: TestStatus.COMPLETED | TestStatus.FAILED | TestStatus.CANCELLED): void {
        const test = this.activeTests.get(taskId);
        if (!test) {
            throw new Error(`Test ${taskId} not found`);
        }

        test.status = status;
        test.endTime = new Date();
        test.totalDuration = test.endTime.getTime() - test.startTime.getTime();

        this.emit('test:completed', taskId, test);
    }

    /**
     * 删除测试任务
     */
    removeTest(taskId: string): void {
        this.activeTests.delete(taskId);
        this.emit('test:removed', taskId);
    }

    /**
     * 获取所有活跃测试
     */
    getAllTests(): Map<string, TestResult> {
        return new Map(this.activeTests);
    }
}
