import winston from 'winston';
import {inspect} from 'util';

const {combine, timestamp, printf, colorize} = winston.format;

/**
 * 日志级别对应的 Emoji
 */
const LEVEL_EMOJIS = {
    error: '❌',
    warn: '⚠️ ',
    info: '📌',
    debug: '🔍',
    verbose: '📝'
};

/**
 * 自定义日志格式
 */
const customFormat = printf((info) => {
    const {level, message, timestamp} = info;
    const emoji = LEVEL_EMOJIS[level as keyof typeof LEVEL_EMOJIS] || '📌';
    const time = new Date(timestamp as string).toLocaleTimeString('zh-CN', {hour12: false});

    // 提取模块名（从 message 中解析 [ModuleName]）
    const messageStr = String(message);
    const moduleMatch = messageStr.match(/^\[([^\]]+)]\s*(.*)/);
    let moduleName = '';
    let actualMessage = messageStr;

    if (moduleMatch) {
        moduleName = moduleMatch[1].padEnd(12); // 模块名固定 12 字符宽度
        actualMessage = moduleMatch[2];
    }

    // 处理元数据（排除 winston 内置字段）
    const metadata: Record<string, any> = {};
    for (const key in info) {
        if (key !== 'level' && key !== 'message' && key !== 'timestamp' &&
            typeof key === 'string') {
            metadata[key] = info[key];
        }
    }

    let meta = '';
    if (Object.keys(metadata).length > 0) {
        meta = '\n' + inspect(metadata, {colors: true, depth: 3});
    }

    const levelStr = level.toUpperCase().padEnd(7);
    const prefix = moduleName ? `${emoji} [${time}] ${levelStr} [${moduleName}]` : `${emoji} [${time}] ${levelStr}`;

    return `${prefix} ${actualMessage}${meta}`;
});

/**
 * 生产级日志器
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize({all: true}),
                customFormat
            )
        })
    ]
});

/**
 * 为不同模块创建子日志器
 */
export function createModuleLogger(moduleName: string) {
    return {
        error: (message: string, ...args: any[]) => logger.error(`[${moduleName}] ${message}`, ...args),
        warn: (message: string, ...args: any[]) => logger.warn(`[${moduleName}] ${message}`, ...args),
        info: (message: string, ...args: any[]) => logger.info(`[${moduleName}] ${message}`, ...args),
        debug: (message: string, ...args: any[]) => logger.debug(`[${moduleName}] ${message}`, ...args),
    };
}
