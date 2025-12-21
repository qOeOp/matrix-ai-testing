import {InspectorClass, InspectorMethod} from '../annotations/InspectorAnnotations';
import {BaseInspector} from './BaseInspector';

@InspectorClass({
    name: 'FundIntegratedScreenInspector',
    description: '资金综合屏巡检',
    keywords: ['资金', 'fund', '资金成本'],
    pageType: 'fund'
})

/**
 * 资金综合屏巡检
 */
export class FundIntegratedScreenInspector extends BaseInspector {

    @InspectorMethod({
        name: '资金综合屏基础巡检',
        description: '资金综合屏基础数据查询巡检',
        keywords: ['基础', 'basic', '默认'],
        isDefault: true,
        order: 1,
        steps: {
            1: '导航到资金综合屏',
            2: '资金综合屏数据查询'
        }
    })
    async inspectBasic(): Promise<void> {
        // 执行步骤1: 导航到资金综合屏
        const screen = await this.step(1).run(async () => {
            return await this.menu.navigate('资金综合屏');
        });

        // 执行步骤2: 资金综合屏数据查询
        await this.step(2).run(async () => {
            // TODO: 添加具体的资金综合屏测试逻辑
            console.log('资金综合屏测试');
        });
    }
}
