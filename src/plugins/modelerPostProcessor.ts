import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CopyHelper } from "../copyHelper";
import { CliConst, M4Node } from "../schema";
import { NodeHelper } from "../nodeHelper";
import { normalize } from "path";

export class ModelerPostProcessor{

    constructor(protected session: Session<CodeModel>){
    }

    public process() {
        Helper.enumerateCodeModel(this.session.model, (n) => {

            // In case cli is shared by multiple instances during modelerfour, do deep copy
            if (!isNullOrUndefined(n.target.language['cli'])) {
                n.target.language['cli'] = CopyHelper.deepCopy(n.target.language['cli']);
            }
        });
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("modeler-post-processor-pre");

    let pn = new ModelerPostProcessor(session);
    pn.process();

    Helper.dumper.dumpCodeModel("modeler-post-processor-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
