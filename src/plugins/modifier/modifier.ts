import { Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { CliDirectiveManager } from "./cliDirective";
import { isNullOrUndefined } from "util";
import { CliConst, CliCommonSchema } from "../../schema";
import { Helper } from "../../helper";

export class Modifier {
    private manager: CliDirectiveManager;

    get codeModel() {
        return this.session.model;
    }

    constructor(protected session: Session<CodeModel>) {
    }

    async init(directives: CliCommonSchema.CliDirective.Directive[]): Promise<Modifier> {
        if (isNullOrUndefined(directives))
            directives = [];
        if (!isNullOrUndefined(directives) && !Array.isArray(directives))
            throw Error("directive is expected to be an array. Please check '-' is set property in yaml")

        this.manager = new CliDirectiveManager();
        await this.manager.LoadDirective(directives);
        return this;
    }

    public process(): CodeModel {

        Helper.enumerateCodeModel(this.codeModel, n => this.manager.process(n));
        return this.codeModel;
    }

}