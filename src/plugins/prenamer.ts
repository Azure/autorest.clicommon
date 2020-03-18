import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node } from "../schema";
import { NodeHelper } from "../nodeHelper";

export class PreNamer{

    constructor(protected session: Session<CodeModel>){
    }

    public process() {
        Helper.enumerateCodeModel(this.session.model, (n) => {
            if (!isNullOrUndefined(n.target.language.default.name))
                NodeHelper.setCliKey(n.target, n.target.language.default.name);
        });
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("prename-pre");

    let pn = new PreNamer(session);
    pn.process();

    Helper.dumper.dumpCodeModel("prename-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}