import {PageAgent} from "@midscene/web";
import {Menu} from "./components/Menu"

export class HomePage{

    readonly menu:Menu
    constructor(private agent: PageAgent) {
        this.menu = new Menu(agent);
    }
}