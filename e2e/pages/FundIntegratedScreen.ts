import {Menu} from "./components/Menu";
import {PageAgent} from "@midscene/web";
import {Inspector} from "../utils/Inspector";

export class FundIntegratedScreen{

    readonly menu:Menu
    public readonly inspector:Inspector
    constructor(public agent: PageAgent) {
        this.menu = new Menu(agent);
        this.inspector = new Inspector(agent);
    }
}