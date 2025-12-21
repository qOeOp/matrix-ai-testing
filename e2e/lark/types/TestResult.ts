/**
 * 步骤状态
 */
export enum StepStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    SKIPPED = 'skipped'
}

/**
 * 测试步骤
 */
export interface TestStep {
    name: string;
    status: StepStatus;
    screenshot?: string; // base64 或 image_key
    duration?: number; // 毫秒
    error?: string;
    startTime?: Date;
}

/**
 * 测试方法信息
 */
export interface TestMethodInfo {
    name: string; // 方法名称（来自InspectorMethod装饰器）
    isRunning: boolean; // 是否是当前正在执行的方法
}

/**
 * 整体测试状态
 */
export enum TestStatus {
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

/**
 * 测试结果
 */
export interface TestResult {
    status: TestStatus;
    userMessage: string;
    steps: TestStep[];
    totalSteps?: number; // 总步骤数
    startTime: Date;
    endTime?: Date;
    totalDuration?: number; // 毫秒
    summary?: string;
    testMethods?: TestMethodInfo[]; // 测试方法列表
    currentMethodIndex?: number; // 当前正在执行的方法索引
}
