import {VISUAL_ELEMENT_TYPES_CONST,Layout} from "../pages/components/Layout";
import {PageAgent} from "@midscene/web";

const type = VISUAL_ELEMENT_TYPES_CONST.join(', ')
export class Inspector{
    constructor(private agent:PageAgent) {
    }
    private snapshot = new Map<string, Layout>();
    private async inspect(components:string[]):Promise<Inspector>{
        const prompt : string = `
        {id: string, type: string, bbox: [number, number, number, number]}[]
        Field description:
            type: 页面组件的类型 限定 ${type}
            id: ${components}
        `
        const results:Layout[] =  await this.agent.aiQuery<Layout[]>(prompt);
        results.forEach(result=>{
            this.snapshot.set(result.id, result);
        })
        return this;
    }

    async verify(inputs: Array<{component: string, expect: string}>){
        await this.inspect(inputs.map(item => item.component));
        interface ExpectLayout extends Layout {
            expect: string;
        }

        const layoutSections: string[] = [];

        for (const {component, expect} of inputs) {
            let layout = this.snapshot.get(component);
            if (!layout) {
                throw new Error(`当前页面未识别到组件 ${component}`)
            }
            (layout as ExpectLayout).expect = expect;
            layoutSections.push(`组件: ${layout.id}
                类型: ${layout.type}
                位置: [${layout.bbox}]
                期望: ${expect}`)
        }

        const prompt = `
            请验证指定bbox窗口内的截图是否符合期望：
            
            ${layoutSections.join('\n\n---\n\n')}
        `;
        await this.agent.aiAssert(prompt,{domIncluded:true});
    }
}