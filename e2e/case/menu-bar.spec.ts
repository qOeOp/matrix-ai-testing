import {test} from "../fixture";

test('test menu bar', async ({menu})=>{
    const fixedIntegratedScreen = await menu.navigate("固收综合屏");
    const fundIntegratedScreen = await menu.navigate("资金综合屏");
});