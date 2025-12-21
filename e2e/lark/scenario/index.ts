import 'reflect-metadata';
import {InspectorRegistry} from '../registry/TestRegistry';
import {FixedIntegratedScreenInspector} from './FixedIntegratedScreenInspector';
import {FundIntegratedScreenInspector} from './FundIntegratedScreenInspector';
import {createModuleLogger} from '../shared/Logger';

const logger = createModuleLogger('Scenario');

/**
 * 巡检注册入口 - 自动注册所有巡检类
 */
export function registerAllInspectors() {
    const registry = InspectorRegistry.getInstance();

    logger.info('开始注册巡检类...');

    // 注册所有巡检类
    registry.register(FixedIntegratedScreenInspector);
    registry.register(FundIntegratedScreenInspector);

    logger.info('所有巡检类注册完成!');
}
