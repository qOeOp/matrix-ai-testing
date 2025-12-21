import 'dotenv/config';
import * as Lark from '@larksuiteoapi/node-sdk';
import {LarkApi} from './api/LarkApi';
import {CardRenderer} from './card/CardRenderer';
import {TestStateManager} from './shared/TestStateManager';
import {PageInspector} from './executor/Executor';
import {v4 as uuidv4} from 'uuid';
import {createModuleLogger} from './shared/Logger';
import {TestStatus} from "./types/TestResult";

const logger = createModuleLogger('Server');

// 调试环境变量加载
if (!process.env.ARK_API_KEY && !process.env.OPENAI_API_KEY) {
    logger.warn('检测到环境变量未加载，尝试从项目根目录加载 .env 文件');
    logger.debug(`当前工作目录: ${process.cwd()}`);

    // 尝试从多个可能的位置加载 .env
    const {default: dotenv} = await import('dotenv');
    const {dirname, join} = await import('path');
    const {fileURLToPath} = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '../..');

    dotenv.config({path: join(projectRoot, '.env')});

    if (process.env.ARK_API_KEY || process.env.OPENAI_API_KEY) {
        logger.info('环境变量加载成功');
    }
}

const baseConfig = {
    appId: 'cli_a9cc032c6d78dbd8',
    appSecret: '2Kmd3mMTWjVNZeAeGnueecEjHLULNZc1',
}

const larkApi = new LarkApi(baseConfig.appId, baseConfig.appSecret);
const larkClient = new Lark.WSClient({...baseConfig, loggerLevel: Lark.LoggerLevel.debug});
const testStateManager = TestStateManager.getInstance();
const pageInspector = new PageInspector();

// 存储任务ID到消息ID的映射（支持多个子任务）
const taskMessageMap = new Map<string, { messageId: string, imageKeys: Map<string, string> }>();

// 监听测试状态变化，实时更新卡片
testStateManager.on('test:created', async (taskId: string) => {
    // 为新创建的测试任务创建并发送卡片
    await createAndSendCard(taskId);
});

testStateManager.on('test:step:added', async (taskId: string) => {
    await updateCard(taskId);
});

testStateManager.on('test:step:updated', async (taskId: string) => {
    await updateCard(taskId);
});

testStateManager.on('test:completed', async (taskId: string) => {
    await updateCard(taskId);
});

/**
 * 为新创建的测试任务创建并发送卡片
 */
async function createAndSendCard(taskId: string): Promise<void> {
    const testResult = testStateManager.getTest(taskId);
    if (!testResult) return;
    
    // 从taskId中提取父消息ID
    // taskId格式: {uuid}_method_{index}
    const match = taskId.match(/^(.+)_method_(\d+)$/);
    if (!match) {
        logger.warn(`Invalid taskId format: ${taskId}`);
        return;
    }
    
    const parentTaskId = match[1];
    const methodIndex = parseInt(match[2]);
    
    // 第一个方法复用初始卡片，不需要创建新卡片
    if (methodIndex === 0) {
        logger.info(`第一个方法复用初始卡片 [taskId=${taskId}]`);
        // 直接更新卡片内容
        await updateCard(taskId);
        return;
    }
    
    const parentMapping = taskMessageMap.get(parentTaskId);
    if (!parentMapping) {
        logger.warn(`Parent task mapping not found for: ${parentTaskId}`);
        return;
    }
    
    // 渲染并发送新卡片（从第二个方法开始）
    const card = CardRenderer.render(testResult);
    const messageId = await larkApi.replyMessage(parentMapping.messageId, card);
    
    if (messageId) {
        // 保存子任务的消息映射
        taskMessageMap.set(taskId, {
            messageId,
            imageKeys: new Map()
        });
        logger.info(`为测试方法创建卡片 [taskId=${taskId}, messageId=${messageId}]`);
    }
}

/**
 * 更新飞书卡片
 */
async function updateCard(taskId: string): Promise<void> {
    const mapping = taskMessageMap.get(taskId);
    if (!mapping) return;

    const testResult = testStateManager.getTest(taskId);
    if (!testResult) return;

    // 上传所有待上传的截图
    for (const step of testResult.steps) {
        if (step.screenshot && !mapping.imageKeys.has(step.name)) {
            const imgKey = await larkApi.uploadBase64Image(step.screenshot);
            if (imgKey) {
                mapping.imageKeys.set(step.name, imgKey);
            }
        }
    }

    // 渲染并更新卡片
    const card = CardRenderer.render(testResult, mapping.imageKeys);
    await larkApi.updateMessage(mapping.messageId, card);
}

const exit = larkClient.start({
    // 处理「接收消息」事件，事件类型为 im.message.receive_v1
    eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': async (data) => {
            const {
                message: {message_id, content}
            } = data;

            let receivedText = JSON.parse(content).text;
            // 移除 @ 占位符
            receivedText = receivedText.replace(/@_user_\d+\s*/g, '').trim();

            logger.info(`接收到消息: ${message_id}`);
            logger.debug(`消息内容: ${receivedText}`);

            // 生成唯一的任务ID（作为父任务ID）
            const taskId = uuidv4();

            // 立即发送初始卡片：正在识别意图
            const initialCard = CardRenderer.render({
                status: TestStatus.PROCESSING,
                userMessage: '🔍 正在识别用户意图...',
                steps: [],
                startTime: new Date()
            });
            const initialMessageId = await larkApi.replyMessage(message_id, initialCard);

            if (!initialMessageId) {
                logger.error('发送初始卡片失败');
                return;
            }

            logger.info(`初始卡片已发送 [messageId=${initialMessageId}]`);

            // 保存父任务ID到消息ID的映射
            taskMessageMap.set(taskId, {
                messageId: message_id, // 使用原始消息ID作为父消息
                imageKeys: new Map()
            });
            
            // 保存第一个方法任务的消息ID（复用初始卡片）
            taskMessageMap.set(`${taskId}_method_0`, {
                messageId: initialMessageId,
                imageKeys: new Map()
            });

            logger.info(`任务创建成功 [taskId=${taskId}]`);

            // 异步执行测试
            void (async () => {
                try {
                    await pageInspector.executeInspection(taskId, receivedText);
                    logger.info(`任务执行完成 [taskId=${taskId}]`);
                } catch (error) {
                    logger.error(`任务执行失败 [taskId=${taskId}]`, {error});
                } finally {
                    // 清理映射（可选，也可以保留用于查询历史）
                    // taskMessageMap.delete(taskId);
                }
            })();
        }
    })
});

console.log(exit);
