/**
 * Step注册中心 - 管理测试步骤的注册和执行
 * 使用多级索引：className -> methodName -> stepIndex -> StepDefinition
 */

export interface StepDefinition {
    name: string;
    description?: string;
    order?: number;
}

export interface RegisteredStep extends StepDefinition {
    implementation?: () => Promise<void>;
}

/**
 * Step注册中心
 * 职责：
 * 1. 注册步骤定义（带名称、顺序）
 * 2. 绑定步骤实现
 * 3. 按顺序执行步骤
 */
export class StepRegistry {
    // 多级索引：className -> methodName -> stepIndex -> RegisteredStep
    private steps: Map<string, Map<string, Map<number, RegisteredStep>>> = new Map();
    // 全局步骤（如登录）
    private globalSteps: Map<number, RegisteredStep> = new Map();

    /**
     * 注册全局步骤（如登录）
     */
    registerGlobalStep(stepIndex: number, definition: StepDefinition): void {
        this.globalSteps.set(stepIndex, {
            ...definition
        });
    }

    /**
     * 注册方法步骤
     */
    registerMethodStep(className: string, methodName: string, stepIndex: number, definition: StepDefinition): void {
        if (!this.steps.has(className)) {
            this.steps.set(className, new Map());
        }
        
        const classMethods = this.steps.get(className)!;
        if (!classMethods.has(methodName)) {
            classMethods.set(methodName, new Map());
        }
        
        const methodSteps = classMethods.get(methodName)!;
        methodSteps.set(stepIndex, {
            ...definition
        });
    }

    /**
     * 获取步骤定义
     */
    getStep(className: string | null, methodName: string | null, stepIndex: number): RegisteredStep | undefined {
        // 全局步骤（stepIndex = 0）
        if (stepIndex === 0) {
            return this.globalSteps.get(0);
        }
        
        // 方法步骤
        if (!className || !methodName) {
            return undefined;
        }
        
        const classMethods = this.steps.get(className);
        if (!classMethods) return undefined;
        
        const methodSteps = classMethods.get(methodName);
        if (!methodSteps) return undefined;
        
        return methodSteps.get(stepIndex);
    }

    /**
     * 获取所有步骤ID（用于调试）
     */
    getStepIds(): string[] {
        const ids: string[] = [];
        
        // 全局步骤
        for (const [index] of this.globalSteps) {
            ids.push(`global_step_${index}`);
        }
        
        // 方法步骤
        for (const [className, classMethods] of this.steps) {
            for (const [methodName, methodSteps] of classMethods) {
                for (const [stepIndex] of methodSteps) {
                    ids.push(`${className}.${methodName}_step_${stepIndex}`);
                }
            }
        }
        
        return ids;
    }

    /**
     * 清空注册表
     */
    clear(): void {
        this.steps.clear();
        this.globalSteps.clear();
    }
}
