import {test} from "../fixture";

test('test fund integrated screen', async ({fundIntegratedScreen})=>{
    await Promise.all([
        fundIntegratedScreen.agent.aiAssert(`
    校验公开市场操作(面积图)：
            1. 横坐标：日期
            2. 纵坐标：总量
            3. 图例（legend）必须包含以下四个项目（区分大小写和拼写）：
               - 逆回购
               - 买断式逆回购
               - MLF
               - 国库定存
            重点: 坐标空间内有明显图表绘制痕迹
    `),
        fundIntegratedScreen.agent.aiAssert(`
    校验资金情绪(折线图)：
            1. 横坐标：日期
            2. 纵坐标：情绪数值(实际数值范围在46-56之间)
            3. 图例（legend）必须包含以下四个项目（区分大小写和拼写）：
               - 全市场
               - 大行
               - 中小行
               - 非银机构
            重点: 坐标空间内有明显图表绘制痕迹
    `)
    ])
});