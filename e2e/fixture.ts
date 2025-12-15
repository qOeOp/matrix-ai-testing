import {test as base} from '@playwright/test';
// @ts-ignore
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
// @ts-ignore
import { PlaywrightAiFixture } from '@midscene/web/playwright';
import {LoginPage} from "./pages/LoginPage";
import {HomePage} from "./pages/HomePage";
import {Menu} from "./pages/components/Menu";
import {FixedIntegratedScreen} from "./pages/FixedIntegratedScreen";
import {FundIntegratedScreen} from "./pages/FundIntegratedScreen";

export const test = base.extend<PlayWrightAiFixtureType & {
    homePage: HomePage,
    menu:Menu,
    fixedIntegratedScreen:FixedIntegratedScreen,
    fundIntegratedScreen:FundIntegratedScreen,
}>({
        ...PlaywrightAiFixture({
                                cache: true,
                                waitForNetworkIdleTimeout: 0,
                                waitForNavigationTimeout: 0,
                                onTaskStartTip: "页面展示金融数据报告 关于数据校验要求高精度 关于金融术语要求精确匹配"
                            }),
        menu: async ({page, agentForPage}:{page:any,agentForPage:any}, use: any) => {
            const loginPage = new LoginPage(page, agentForPage);
            const menu = await loginPage.login("test_xiaoshenyang","123456")
            await use(menu);
        },
        homePage: async ({menu}:{menu:Menu}, use: any) => {
            const homePage = await menu.navigate("首页");
            await use(homePage);
        },
        fixedIntegratedScreen: async ({menu}:{menu:Menu}, use: any) => {
            const fixedIntegratedScreen = await menu.navigate("固收综合屏");
            await use(fixedIntegratedScreen);
        },
        fundIntegratedScreen: async ({menu}:{menu:Menu}, use: any) => {
            const fundIntegratedScreen = await menu.navigate("资金综合屏");
            await use(fundIntegratedScreen);
        },
    }
)
