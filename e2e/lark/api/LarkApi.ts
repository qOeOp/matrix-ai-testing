import * as Lark from '@larksuiteoapi/node-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class LarkApi {
    private readonly client: Lark.Client;

    constructor(appId: string, appSecret: string) {
        this.client = new Lark.Client({
            appId,
            appSecret
        });
    }

    /**
     * 上传 base64 图片到飞书，返回 image_key
     */
    async uploadBase64Image(base64String: string): Promise<string | null> {
        let tempFilePath: string | null = null;
        try {
            // 移除 base64 前缀
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // 创建临时文件
            tempFilePath = path.join(os.tmpdir(), `midscene_${Date.now()}.png`);
            fs.writeFileSync(tempFilePath, imageBuffer);

            // 创建文件流
            const imageStream = fs.createReadStream(tempFilePath);

            // 上传图片
            const uploadResult = await this.client.im.v1.image.create({
                data: {
                    image_type: 'message',
                    image: imageStream
                }
            });

            return uploadResult?.image_key || null;
        } catch (error) {
            console.error('上传图片失败:', error);
            return null;
        } finally {
            // 删除临时文件
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (e) {
                    console.error('删除临时文件失败:', e);
                }
            }
        }
    }

    /**
     * 回复消息（发送卡片）
     */
    async replyMessage(messageId: string, card: any): Promise<string | null> {
        try {
            const response = await this.client.im.v1.message.reply({
                data: {
                    content: JSON.stringify(card),
                    msg_type: 'interactive'
                },
                path: {message_id: messageId}
            });

            return response.data?.message_id || null;
        } catch (error) {
            console.error('回复消息失败:', error);
            return null;
        }
    }

    /**
     * 更新消息（更新卡片）
     */
    async updateMessage(messageId: string, card: any): Promise<boolean> {
        try {
            await this.client.im.v1.message.patch({
                data: {
                    content: JSON.stringify(card)
                },
                path: {message_id: messageId}
            });

            return true;
        } catch (error) {
            console.error('更新消息失败:', error);
            return false;
        }
    }

    /**
     * 获取 Client 实例（用于其他操作）
     */
    getClient(): Lark.Client {
        return this.client;
    }
}
