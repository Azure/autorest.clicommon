import { Session, Host } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { CliDirectiveManager } from "./cliDirective";
import { isNullOrUndefined } from "util";
import { CliConst, CliCommonSchema } from "../../schema";
import { Helper } from "../../helper";

export class Modifier {
    private manager: CliDirectiveManager;

    get codeModel(): CodeModel {
        return this.session.model;
    }

    constructor(protected session: Session<CodeModel>) {
    }

    async init(directives: CliCommonSchema.CliDirective.Directive[]): Promise<Modifier> {
        if (isNullOrUndefined(directives))
            directives = [];
        if (!isNullOrUndefined(directives) && !Array.isArray(directives))
            throw Error("directive is expected to be an array. Please check '-' is set property in yaml");

        this.manager = new CliDirectiveManager();
        await this.manager.LoadDirective(directives);
        return this;
    }

    public process(): CodeModel {

        Helper.enumerateCodeModel(this.codeModel, n => this.manager.process(n));
        return this.codeModel;
    }

}

export async function processRequest(host: Host): Promise<void> {
    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel("modifier-pre");
    
    const arr = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, null);
    const modifier = await new Modifier(session).init(arr);
    modifier.process();

    Helper.dumper.dumpCodeModel("modifier-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
