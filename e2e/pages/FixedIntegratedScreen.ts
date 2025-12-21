import {Menu} from "./components/Menu";
import {PageAgent} from "@midscene/web";

export class FixedIntegratedScreen {

    readonly menu: Menu

    constructor(public agent: PageAgent) {
        this.menu = new Menu(agent);
    }

    // 1. 利率债矩阵
    async rate_bond_matrix(): Promise<void> {
        await this.agent.aiTap("利率债矩阵");
    }

    // 2. 地方债矩阵
    async local_government_bond_matrix(): Promise<void> {
        await this.agent.aiTap("地方债矩阵");
    }

    // 3. 信用债矩阵
    async credit_bond_matrix(): Promise<void> {
        await this.agent.aiTap("信用债矩阵");
    }

    // 4. NCD矩阵 (二级市场)
    async ncd_matrix(): Promise<void> {
        await this.agent.aiTap("NCD矩阵");
    }

    // 5. NCD一级市场
    async ncd_primary_market(): Promise<void> {
        await this.agent.aiTap("NCD一级");
    }

    // 6. 中资美元债
    async china_usd_bond(): Promise<void> {
        await this.agent.aiTap("中资美元债");
    }

    // 7. 全球国债
    async global_government_bonds(): Promise<void> {
        await this.agent.aiTap("全球国债");
    }

    // 8. 国债期货
    async government_bond_futures(): Promise<void> {
        await this.agent.aiTap("国债期货");
    }

    // 9. 中国股指
    async china_stock_indices(): Promise<void> {
        await this.agent.aiTap("中国股指");
    }

    // 10. 外汇
    async foreign_exchange(): Promise<void> {
        await this.agent.aiTap("外汇");
    }

    // 11. 大宗商品
    async commodities(): Promise<void> {
        await this.agent.aiTap("大宗");
    }
}