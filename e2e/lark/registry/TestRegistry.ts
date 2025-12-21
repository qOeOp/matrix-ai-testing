import 'reflect-metadata';
import {InspectorClass, InspectorMethod} from '../annotations/InspectorAnnotations';
import {createModuleLogger} from '../shared/Logger';

const logger = createModuleLogger('Registry');

/**
 * 巡检信息
 */
export interface InspectorInfo {
    classConfig: InspectorClass;
    classInstance: any;
    methods: Array<InspectorMethod & { methodName: string }>;
}

/**
 * 巡检注册中心 - 自动扫描和注册所有巡检类
 */
export class InspectorRegistry {
    private static instance: InspectorRegistry;
    private inspectorClasses: Map<string, InspectorInfo> = new Map();

    private constructor() {
    }

    static getInstance(): InspectorRegistry {
        if (!InspectorRegistry.instance) {
            InspectorRegistry.instance = new InspectorRegistry();
        }
        return InspectorRegistry.instance;
    }

    /**
     * 注册巡检类
     */
    register(inspectorClass: any): void {
        const classConfig: InspectorClass = Reflect.getMetadata('inspector:class', inspectorClass);
        if (!classConfig) {
            console.warn(`Class ${inspectorClass.name} is not decorated with @InspectorClass`);
            return;
        }

        // 先创建实例，触发 addInitializer 注册方法元数据
        const classInstance = new inspectorClass();

        // 再读取元数据（此时已经注册完成）
        const methods: Array<InspectorMethod & { methodName: string }> =
            Reflect.getMetadata('inspector:methods', inspectorClass) || [];

        const inspectorInfo: InspectorInfo = {
            classConfig,
            classInstance,
            methods: methods.sort((a, b) => (a.order || 999) - (b.order || 999))
        };

        this.inspectorClasses.set(classConfig.name, inspectorInfo);
        logger.info(`注册巡检类: ${classConfig.name} (${classConfig.description})`);
        logger.debug(`包含 ${methods.length} 个巡检方法`);
    }

    /**
     * 根据页面类型获取巡检类
     */
    getInspectorByPageType(pageType: string): InspectorInfo | undefined {
        for (const [_, inspectorInfo] of this.inspectorClasses) {
            if (inspectorInfo.classConfig.pageType === pageType) {
                return inspectorInfo;
            }
        }
        return undefined;
    }

    /**
     * 根据关键词搜索巡检类
     */
    searchInspectorClass(keywords: string[]): InspectorInfo | undefined {
        for (const [_, inspectorInfo] of this.inspectorClasses) {
            const classKeywords = inspectorInfo.classConfig.keywords;
            if (keywords.some(k => classKeywords.some(ck => ck.includes(k) || k.includes(ck)))) {
                return inspectorInfo;
            }
        }
        return undefined;
    }

    /**
     * 在巡检类中根据关键词搜索巡检方法
     */
    searchInspectorMethods(inspectorInfo: InspectorInfo, keywords: string[]): Array<InspectorMethod & {
        methodName: string
    }> {
        const matchedMethods = inspectorInfo.methods.filter(method => {
            return keywords.some(k => method.keywords.some(mk => mk.includes(k) || k.includes(mk)));
        });

        // 如果没有匹配到，返回默认方法
        if (matchedMethods.length === 0) {
            const defaultMethods = inspectorInfo.methods.filter(m => m.isDefault);
            return defaultMethods.length > 0 ? defaultMethods : inspectorInfo.methods.slice(0, 1);
        }

        return matchedMethods;
    }

    /**
     * 获取所有注册的巡检类
     */
    getAllInspectors(): Map<string, InspectorInfo> {
        return this.inspectorClasses;
    }

    /**
     * 获取巡检类和方法的描述（用于 LLM prompt）
     */
    getInspectorDescriptions(): string {
        let desc = '可用的巡检类和方法：\n\n';

        for (const [name, inspectorInfo] of this.inspectorClasses) {
            desc += `【${inspectorInfo.classConfig.description}】\n`;
            desc += `  关键词: ${inspectorInfo.classConfig.keywords.join(', ')}\n`;
            desc += `  页面类型: ${inspectorInfo.classConfig.pageType}\n`;
            desc += `  巡检方法:\n`;

            inspectorInfo.methods.forEach((method, index) => {
                desc += `    ${index + 1}. ${method.name} - ${method.description}\n`;
                desc += `       关键词: ${method.keywords.join(', ')}\n`;
            });

            desc += '\n';
        }

        return desc;
    }
}
