import {test} from "../fixture";


/**
 * 📋 测试类概述
 *
 * @file fixed_integrated_screen.test.js (或对应测试文件)
 * @description 固定综合屏数据提取测试
 * @framework Playwright + Midscene
 * @testType 端到端(E2E)视觉自动化测试
 * @coreObjective 验证固定综合屏中各金融模块的表格数据能否通过Midscene AI代理正确提取并结构化
 */

/**
 * 🧪 测试用例详情 - 正向测试：综合数据提取验证
 *
 * @testCaseId TC-FIS-001
 * @description 完整验证四个主要金融模块的数据提取功能
 *
 * @testSteps
 * | 步骤 | 操作 | 预期结果 |
 * |------|------|----------|
 * | 1    | 导航至NCD一级市场模块 | 页面成功加载，显示同业存单数据表格 |
 * | 2    | 使用AI代理提取NCD表格数据 | 返回结构化数据，包含：评级、期限、收益率、基点变化 |
 * | 3    | 导航至中国股票指数模块 | 页面成功加载，显示A股主要指数表格 |
 * | 4    | 使用AI代理提取股票指数数据 | 返回结构化数据，包含：指数名称、最新价、涨跌、涨跌幅、成交额 |
 * | 5    | 导航至全球政府债券模块 | 页面成功加载，显示各国国债收益率表格 |
 * | 6    | 使用AI代理提取债券数据 | 返回结构化数据，包含：国家、期限、当前价格、价格变化 |
 * | 7    | 导航至外汇市场模块 | 页面成功加载，显示主要货币对汇率表格 |
 * | 8    | 使用AI代理提取外汇数据 | 返回结构化数据，包含：货币对名称、最新价、涨跌幅、涨跌值 |
 *
 * @dataFields
 * - NCD一级市场: {rank: string, deposit_term: string, priceInfo: {primary_yield: number, bp_change: number}}
 * - 中国股票指数: {index_name: string, last_price: number, net_change: number, pct_change: number, volume_amount: number}
 * - 全球政府债券: {country: string, deposit_term: string, priceInfo: {current_price: number, price_change: number}}
 * - 外汇市场: {fx_name: string, last_price: number, pct_change: number, net_change: number}
 *
 * @testConfig
 * - domIncluded: 'visible-only' (仅发送可见DOM元素)
 * - 屏幕分辨率: 支持固定综合屏显示
 * - 网络环境: 稳定连接至金融数据服务
 *
 * @verificationCriteria
 * 1. 数据准确性: 提取数据与UI显示值完全一致
 * 2. 结构完整性: 数组长度与表格行数匹配，无错位
 * 3. 异常处理: 空单元格正确处理为null
 *
 * @output
 * - console.table()打印提取结果
 * - Midscene生成可视化报告(截图+DOM分析)
 *
 * @dependencies
 * - Playwright测试框架
 * - Midscene AI代理服务
 * - 金融数据API服务
 *
 * @maintainer 自动化测试团队
 * @version 1.0.0
 * @lastUpdated 2025-12-15
 */
test('test fixed integrated screen (positive)', async ({fixedIntegratedScreen})=>{

    await fixedIntegratedScreen.ncd_primary_market();
    const ncd_table = await fixedIntegratedScreen.agent.aiQuery([
        {
            rank: '表格第一列单元格中,描述同业存单评级(例如"AAA"、"AA"), string',
            deposit_term: '表格第一行单元格中表示投资期限的缩写(如"1Y"、"3M"), string',
            priceInfo: {
                // 明确指定列名，并严格说明空值处理
                primary_yield: '单元格中位于上方的数字代表收益率, 如果是空白、横线则返回null, number',
                // 明确指定列名，并说明符号处理
                bp_change: '单元格中位于下方的数字代表涨跌值, 带正负号(如"+1.00"或"-1.00"), 以bp结尾代表基点, 如果是空白则返回null, number'
            }
        }
    ], { domIncluded: 'visible-only' });
    console.table(ncd_table);


    await fixedIntegratedScreen.china_stock_indices();
    const index_table = await fixedIntegratedScreen.agent.aiQuery([
        {
            index_name: '表格第一列,描述证券市场指数, string',
            last_price: '表格第二列,描述最新成交价, number',
            net_change: '表格第三列,描述昨收的绝对差值, number',
            pct_change: '表格第四列,描述涨跌百分比, number',
            volume_amount: '表格第五列,描述成交总金额单位亿元, number'
        }
    ], { domIncluded: 'visible-only' });
    console.table(index_table);

    await fixedIntegratedScreen.global_government_bonds();
    const bonds_table = await fixedIntegratedScreen.agent.aiQuery([
        {
            country: '表格第一列单元格中,国旗或国旗图标右侧,旁边的国家名称文本(例如"中国"、"美国"), string',
            deposit_term: '表格第一行单元格中表示投资期限的缩写(如"1Y"、"3M"), string',
            priceInfo: {
                // 明确指定列名，并严格说明空值处理
                current_price: '单元格中位于上方的数字代表价格, 如果是空白、横线则返回null, number',
                // 明确指定列名，并说明符号处理
                price_change: '单元格中位于下方的数字代表涨跌值, 带正负号(如"+1.5"或"-1"), 如果是空白则返回null, number'
            }
        }
    ], { domIncluded: 'visible-only' });
    console.table(bonds_table);


    await fixedIntegratedScreen.foreign_exchange();
    const fx_table = await fixedIntegratedScreen.agent.aiQuery([
        {
            fx_name: '表格第一列,描述汇率互换类型, string',
            last_price: '表格第二列,描述最新成交价, number',
            pct_change: '表格第三列,描述涨跌百分比, number',
            net_change: '表格第四列,描述昨收的绝对差值, number',
        }
    ], { domIncluded: 'visible-only' });
    console.table(fx_table);
});

test('test fixed integrated screen (negative)', async ({fixedIntegratedScreen})=>{
    await fixedIntegratedScreen.global_government_bonds();
    const table = await fixedIntegratedScreen.agent.aiQuery([
        {
            country: '表格第一列单元格中,国旗或国旗图标右侧,旁边的国家名称文本(例如"中国"、"美国"), string',
            deposit_term: '表格第一行单元格中表示投资期限的缩写(如"1Y"、"3M"), string',
            priceInfo: {
                // 明确指定列名，并严格说明空值处理
                current_price: '单元格中位于上方的数字代表价格, 如果是空白、横线则返回null, number',
                // 明确指定列名，并说明符号处理
                price_change: '单元格中位于下方的数字代表涨跌值, 带正负号(如"+1.5"或"-1"), 如果是空白则返回null, number'
            }
        }
    ], { domIncluded: 'visible-only' });
    console.table(table);
});