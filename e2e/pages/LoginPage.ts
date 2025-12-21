import {PageAgent} from "@midscene/web";
import {Menu} from "./components/Menu";
import {Page} from 'playwright';

export class LoginPage {
    constructor(private page: Page, private agentForPage: (page: Page) => PageAgent) {

    }

    public async login(username: string, password: string): Promise<Menu> {
        // 1. 导航并获取主页面agent
        await this.page.goto("https://web.innodealing.com/");

        const agent = this.agentForPage(this.page);

        // 2. 使用agent执行登录操作
        await agent.aiInput("DM账号", {value: username, xpath: "//input[@id='inputUsername']"});
        await agent.aiInput("密码", {value: password, xpath: "//input[@id='inputPassword']"});
        await agent.aiTap("勾选 我已阅读并同意相关服务条款和政策");
        await agent.aiTap("登录", {xpath: "//button[text()='登录']"});
        await this.page.goto("https://web.innodealing.com/quote-web/#/bond/home?tab=1");
        console.log("等待弹窗出现");
        await agent.aiWaitFor("弹窗完全出现", {timeoutMs: 10000});
        console.log("消除弹窗");
        await agent.aiTap("关闭弹窗");
        return new Menu(agent);
    }
}