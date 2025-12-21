import {InspectorInfo, InspectorRegistry} from '../registry/TestRegistry';
import OpenAI from 'openai';
import {createModuleLogger} from '../shared/Logger';

const logger = createModuleLogger('Dispatcher');

/**
 * 巡检执行计划
 */
export interface InspectionPlan {
    inspectorClass: InspectorInfo;
    methods: Array<{ methodName: string; name: string; description: string }>;
    pageType: string;
}

/**
 * LLM 返回的原始计划结构
 */
interface LLMRawPlan {
    inspectorClassName: string;
    methods: string[];  // 方法名数组
    reasoning?: string; // LLM 的推理过程（可选）
}

/**
 * LLM 巡检分发器 - 使用 LLM 智能解析用户意图并生成巡检计划
 */
export class LLMSpectatorDispatcher {
    private registry: InspectorRegistry;
    private readonly openai: OpenAI | null = null;
    private readonly useLLM: boolean = false;

    constructor() {
        this.registry = InspectorRegistry.getInstance();

        // 尝试初始化 OpenAI 客户端（兼容火山引擎和 OpenAI）
        const apiKey = process.env.ARK_API_KEY || process.env.OPENAI_API_KEY;
        const baseURL = process.env.ARK_BASE_URL || process.env.OPENAI_BASE_URL;
        const defaultBaseURL = process.env.ARK_API_KEY
            ? 'https://ark.cn-beijing.volces.com/api/v3'
            : 'https://api.openai.com/v1';

        if (apiKey) {
            this.openai = new OpenAI({
                apiKey,
                baseURL: baseURL || defaultBaseURL
            });
            this.useLLM = true;
            const provider = process.env.ARK_API_KEY ? '火山引擎' : 'OpenAI';
            logger.info(`LLM 模式已启用 (${provider})`);
            logger.debug(`Base URL: ${baseURL || defaultBaseURL}`);
            logger.debug(`Model: ${process.env.ARK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
        } else {
            logger.warn('未配置 ARK_API_KEY 或 OPENAI_API_KEY，使用关键词匹配模式');
        }
    }

    /**
     * 解析用户消息并生成巡检执行计划
     */
    async parseUserMessage(userMessage: string): Promise<InspectionPlan | null> {
        const inspectorDescriptions = this.registry.getInspectorDescriptions();

        // 优先使用 LLM，如果不可用则降级到关键词匹配
        if (this.useLLM && this.openai) {
            try {
                return await this.llmParse(userMessage, inspectorDescriptions);
            } catch (error) {
                logger.error('LLM 解析失败，降级到关键词匹配', {error});
                return await this.keywordParse(userMessage);
            }
        } else {
            return await this.keywordParse(userMessage);
        }
    }

    /**
     * 使用 LLM 进行智能解析
     */
    private async llmParse(userMessage: string, inspectorDescriptions: string): Promise<InspectionPlan | null> {
        if (!this.openai) {
            logger.error('OpenAI 客户端未初始化');
            return null;
        }

        logger.info(`使用 LLM 解析用户意图: ${userMessage}`);

        const prompt = this.buildPrompt(userMessage, inspectorDescriptions);

        const response = await this.openai.chat.completions.create({
            model: process.env.ARK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: '你是一个页面巡检任务分发专家。你需要根据用户的描述，从可用的巡检场景中选择最合适的巡检方法。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: {type: 'json_object'},
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            logger.error('LLM 返回内容为空');
            return null;
        }

        logger.debug(`LLM 原始响应: ${content}`);

        const rawPlan: LLMRawPlan = JSON.parse(content);

        // 将 LLM 返回的计划映射到实际的巡检
        return this.mapRawPlanToInspection(rawPlan);
    }

    /**
     * 将 LLM 返回的原始计划映射到实际的巡检执行计划
     */
    private mapRawPlanToInspection(rawPlan: LLMRawPlan): InspectionPlan | null {
        logger.debug(`映射 LLM 计划到巡检: ${JSON.stringify(rawPlan)}`);

        // 1. 查找巡检类
        const allInspectors = this.registry.getAllInspectors();
        const inspectorClass = allInspectors.get(rawPlan.inspectorClassName);

        if (!inspectorClass) {
            logger.error(`未找到巡检类: ${rawPlan.inspectorClassName}`);
            logger.debug(`可用的巡检类: ${Array.from(allInspectors.keys()).join(', ')}`);
            return null;
        }

        logger.debug(`找到巡检类: ${inspectorClass.classConfig.name}`);

        // 2. 映射方法名到实际的方法
        const methods = rawPlan.methods
            .map(methodName => {
                const method = inspectorClass.methods.find(m => m.methodName === methodName);
                if (!method) {
                    logger.warn(`未找到方法: ${methodName}`);
                    return null;
                }
                return {
                    methodName: method.methodName,
                    name: method.name,
                    description: method.description
                };
            })
            .filter(m => m !== null) as Array<{ methodName: string; name: string; description: string }>;

        if (methods.length === 0) {
            logger.error('没有找到任何有效的巡检方法');
            return null;
        }

        logger.info(`映射到巡检方法: ${methods.map(m => m.name).join(', ')}`);

        if (rawPlan.reasoning) {
            logger.debug(`LLM 推理: ${rawPlan.reasoning}`);
        }

        return {
            inspectorClass,
            methods,
            pageType: inspectorClass.classConfig.pageType
        };
    }

    /**
     * 构建 LLM Prompt
     */
    private buildPrompt(userMessage: string, inspectorDescriptions: string): string {
        return `
# 任务说明
你需要根据用户的需求，从可用的页面巡检场景中选择最合适的巡检类和巡检方法。

# 可用的巡检场景
${inspectorDescriptions}

# 用户需求
"${userMessage}"

# 理解规则
1. **精确匹配**：如果用户明确指定了某个巡检方法的名称（如"NCD一级市场"、"资金成本"），则只返回该方法
2. **标签匹配**：如果用户提到某个关键词标签（如"固收"、"fund"、"ncd"），则返回该标签对应的所有相关方法
3. **全量巡检**：如果用户说"全部"、"所有"、"完整巡检"等，则返回该巡检类的所有方法
4. **模糊匹配**：如果用户描述不明确，根据语义选择最相关的1-3个方法
5. **优先级**：当有多个匹配时，优先选择 isDefault=true 的方法

# 输出要求
请返回严格的 JSON 格式，不要有任何其他内容：
{
  "inspectorClassName": "巡检类的完整名称（如 FixedIntegratedScreenInspector）",
  "methods": ["方法名1", "方法名2"],
  "reasoning": "简要说明为什么选择这些方法（可选）"
}

# 示例
用户输入："检查固收的ncd数据"
输出：
{
  "inspectorClassName": "FixedIntegratedScreenInspector",
  "methods": ["inspectNCD"],
  "reasoning": "用户明确提到固收和ncd，匹配到NCD一级市场巡检方法"
}

用户输入："巡检所有固收相关功能"
输出：
{
  "inspectorClassName": "FixedIntegratedScreenInspector",
  "methods": ["inspectNCD", "inspectPositive", "inspectChinaStockIndices", "inspectGlobalGovernmentBonds"],
  "reasoning": "用户要求巡检所有固收功能，返回该类的全部方法"
}

用户输入："资金"
输出：
{
  "inspectorClassName": "FundIntegratedScreenInspector",
  "methods": ["inspectBasic"],
  "reasoning": "用户提到资金，匹配到资金综合屏的默认巡检方法"
}

现在请处理上述用户需求，只返回 JSON，不要有其他内容。
`.trim();
    }

    /**
     * 关键词匹配模式（降级方案）
     */
    private async keywordParse(userMessage: string): Promise<InspectionPlan | null> {
        logger.info(`使用关键词匹配模式解析: ${userMessage}`);

        // 将消息转为小写并分词
        const keywords = this.extractKeywords(userMessage);
        logger.debug(`提取的关键词: ${JSON.stringify(keywords)}`);

        // 1. 搜索匹配的巡检类
        const inspectorClass = this.registry.searchInspectorClass(keywords);
        if (!inspectorClass) {
            logger.warn('未找到匹配的巡检类');
            return null;
        }

        logger.info(`匹配到巡检类: ${inspectorClass.classConfig.name}`);

        // 2. 在巡检类中搜索匹配的方法
        const methods = this.registry.searchInspectorMethods(inspectorClass, keywords);
        logger.info(`匹配到巡检方法: ${methods.map(m => m.name).join(', ')}`);

        // 3. 生成执行计划
        return {
            inspectorClass,
            methods: methods.map(m => ({
                methodName: m.methodName,
                name: m.name,
                description: m.description
            })),
            pageType: inspectorClass.classConfig.pageType
        };
    }

    /**
     * 提取关键词
     */
    private extractKeywords(message: string): string[] {
        // 转小写
        const lowerMessage = message.toLowerCase();

        // 分词（简单版）
        const words = lowerMessage.split(/[\s,，。！？、]+/).filter(w => w.length > 0);

        // 添加原始消息的子串（用于匹配多字关键词）
        const keywords = [...words];

        // 添加一些常见的缩写和别名
        if (lowerMessage.includes('固收')) keywords.push('fixed');
        if (lowerMessage.includes('资金')) keywords.push('fund');
        if (lowerMessage.includes('巡检')) keywords.push('inspect');
        if (lowerMessage.includes('检查')) keywords.push('check');

        return keywords;
    }
}
