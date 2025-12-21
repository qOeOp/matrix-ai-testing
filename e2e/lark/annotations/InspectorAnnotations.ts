import 'reflect-metadata';

/**
 * 巡检类注解
 */
export interface InspectorClass {
    /**
     * 巡检类名称
     */
    name: string;

    /**
     * 巡检类描述
     */
    description: string;

    /**
     * 关键词列表 - 用于匹配用户输入
     */
    keywords: string[];

    /**
     * 页面类型
     */
    pageType: 'fixed' | 'fund' | 'home' | 'custom';
}

/**
 * 巡检方法注解
 */
export interface InspectorMethod {
    /**
     * 巡检方法名称
     */
    name: string;

    /**
     * 巡检方法描述
     */
    description: string;

    /**
     * 关键词列表 - 用于匹配用户输入
     */
    keywords: string[];

    /**
     * 是否默认执行
     */
    isDefault?: boolean;

    /**
     * 执行顺序
     */
    order?: number;

    /**
     * 步骤映射 - 索引(从1开始) -> 步骤名称
     * 例如: { 1: '导航到NCD一级市场', 2: '查询NCD数据' }
     */
    steps?: Record<number, string>;
}

/**
 * 巡检类装饰器
 */
export function InspectorClass(config: InspectorClass) {
    return function (constructor: Function, context: ClassDecoratorContext): void {
        Reflect.defineMetadata('inspector:class', config, constructor);
        Reflect.defineMetadata('inspector:class:name', config.name, constructor);
    };
}

/**
 * 巡检方法装饰器
 */
export function InspectorMethod(config: InspectorMethod) {
    return function (target: Function, context: ClassMethodDecoratorContext): void {
        // 使用 context.addInitializer 在类初始化时注册方法
        context.addInitializer(function (this: any) {
            const constructor = this.constructor;
            const propertyKey = String(context.name);

            const methods = Reflect.getMetadata('inspector:methods', constructor) || [];
            methods.push({
                ...config,
                methodName: propertyKey
            });
            Reflect.defineMetadata('inspector:methods', methods, constructor);
            Reflect.defineMetadata(`inspector:method:${propertyKey}`, config, constructor);
        });
    };
}
