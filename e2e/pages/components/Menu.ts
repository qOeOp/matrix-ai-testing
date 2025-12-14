import {PageAgent} from "@midscene/web";
import {FixedIntegratedScreen} from "../FixedIntegratedScreen";
import {FundIntegratedScreen} from "../FundIntegratedScreen";
import {HomePage} from "../HomePage";

type Tab =
    | '首页'
    | '自选雷达'
    | '我的关注'
    | '多资产综合屏'
    | '中华人民共和国财政部'
    | '成交统计'
    | '利差曲线'
    | '舆情'
    | '债市复盘'
    | '固收综合屏'
    | '资金综合屏';
export class Menu{
    constructor(private agent: PageAgent) {
    };

    public async navigate(tab :Tab){
        await this.agent.aiTap(`${tab} 标签`, {xpath: `//div[@id='dm-matrix-header-global']//div[contains(@text,'${tab}')]`});
        switch (tab){
            case "首页":
                return new HomePage(this.agent);
            case "固收综合屏":
                return new FixedIntegratedScreen(this.agent);
            case "资金综合屏":
                return new FundIntegratedScreen(this.agent);
        }
    }
}