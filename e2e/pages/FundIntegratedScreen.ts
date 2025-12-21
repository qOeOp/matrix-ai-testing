import {Menu} from "./components/Menu";
import {PageAgent} from "@midscene/web";

export class FundIntegratedScreen {

    readonly menu: Menu

    constructor(public agent: PageAgent) {
        this.menu = new Menu(agent);
    }
}