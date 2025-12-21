import {InspectorClass, InspectorMethod} from '../annotations/InspectorAnnotations';
import {BaseInspector} from './BaseInspector';

@InspectorClass({
    name: 'FixedIntegratedScreenInspector',
    description: '固收综合屏巡检',
    keywords: ['固收', 'fixed', '利率债', '信用债'],
    pageType: 'fixed'
})

/**
 * 固收综合屏巡检
 */
export class FixedIntegratedScreenInspector extends BaseInspector {

    @InspectorMethod({
        name: 'NCD一级市场巡检',
        description: '巡检NCD一级市场的数据查询功能',
        keywords: ['ncd', '一级市场', '票据'],
        isDefault: true,
        order: 1,
        steps: {
            1: '导航到固收综合屏',
            2: '导航到NCD一级市场',
            3: '查询NCD一级市场数据'
        }
    })
    async inspectNCD(): Promise<void> {
        // 执行步骤1: 导航到固收综合屏
        const screen = await this.step(1).run(async () => {
            return await this.menu.navigate('固收综合屏');
        });

        // 执行步骤2: 导航到NCD一级市场
        await this.step(2).run(async () => {
            await screen.ncd_primary_market();
        });

        // 执行步骤3: 查询NCD数据
        await this.step(3).run(async () => {
            const ncd_table = await screen.agent.aiQuery(
                {
                    '[row]': '{[column]:{value_change:number,bp_change:string}}'
                },
                {domIncluded: true}
            );
            console.table(ncd_table);
        });
    }

    @InspectorMethod({
        name: 'Markdown格式转换巡检',
        description: '巡检将NCD一级矩阵转换为Markdown格式',
        keywords: ['markdown', '格式转换', 'positive'],
        order: 2,
        steps: {
            1: '导航到固收综合屏',
            2: '导航到NCD一级市场',
            3: 'Markdown格式转换'
        }
    })
    async inspectPositive(): Promise<void> {
        // 执行步骤1: 导航到固收综合屏
        const screen = await this.step(1).run(async () => {
            return await this.menu.navigate('固收综合屏');
        });

        // 执行步骤2: 导航到NCD一级市场
        await this.step(2).run(async () => {
            await screen.ncd_primary_market();
        });

        // 执行步骤3: Markdown格式转换
        await this.step(3).run(async () => {
            const ncd_table = await screen.agent.aiQuery({
                "markdown": "将NCD一级矩阵 转换为Markdown格式, string"
            });
            console.table(ncd_table);
        });
    }

    @InspectorMethod({
        name: '中国股指数据巡检',
        description: '巡检中国股指数据查询功能',
        keywords: ['股指', '指数', 'china stock'],
        order: 3,
        steps: {
            1: '导航到固收综合屏',
            2: '导航到中国股指',
            3: '查询中国股指数据'
        }
    })
    async inspectChinaStockIndices(): Promise<void> {
        // 执行步骤1: 导航到固收综合屏
        const screen = await this.step(1).run(async () => {
            return await this.menu.navigate('固收综合屏');
        });

        // 执行步骤2: 导航到中国股指
        await this.step(2).run(async () => {
            await screen.china_stock_indices();
        });

        // 执行步骤3: 查询股指数据
        await this.step(3).run(async () => {
            const index_table = await screen.agent.aiQuery([
                {
                    index_name: '表格第一列,描述证券市场指数, string',
                    last_price: '表格第二列,描述最新成交价, number',
                    net_change: '表格第三列,描述昨收的绝对差值, number',
                    pct_change: '表格第四列,描述涨跌百分比, number',
                    volume_amount: '表格第五列,描述成交总金额单位亿元, number'
                }
            ], {domIncluded: 'visible-only'});
            console.table(index_table);
        });
    }

    @InspectorMethod({
        name: '全球国债数据巡检',
        description: '巡检全球国债数据查询功能',
        keywords: ['国债', 'government bond', 'global'],
        order: 4,
        steps: {
            1: '导航到固收综合屏',
            2: '导航到全球国债',
            3: '查询全球国债数据'
        }
    })
    async inspectGlobalGovernmentBonds(): Promise<void> {
        // 执行步骤1: 导航到固收综合屏
        const screen = await this.step(1).run(async () => {
            return await this.menu.navigate('固收综合屏');
        });

        // 执行步骤2: 导航到全球国债
        await this.step(2).run(async () => {
            await screen.global_government_bonds();
        });

        // 执行步骤3: 查询国债数据
        await this.step(3).run(async () => {
            const bonds_table = await screen.agent.aiQuery([
                {
                    country: '表格第一列单元格中,国旗或国旗图标右侧,旁边的国家名称文本(例如"中国"、"美国"), string',
                    deposit_term: '表格第一行单元格中表示投资期限的缩写(如"1Y"、"3M"), string',
                    priceInfo: {
                        current_price: '单元格中位于上方的数字代表价格, 如果是空白、横线则返回null, number',
                        price_change: '单元格中位于下方的数字代表涨跌值, 带正负号(如"+1.5"或"-1"), 如果是空白则返回null, number'
                    }
                }
            ], {domIncluded: 'visible-only'});
            console.table(bonds_table);
        });
    }
}
