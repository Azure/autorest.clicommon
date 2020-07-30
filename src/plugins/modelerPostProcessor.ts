import { Host, Session } from "@azure-tools/autorest-extension-base";
import { ChoiceSchema, CodeModel, Parameter, SealedChoiceSchema, StringSchema } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CopyHelper } from "../copyHelper";
import { CliCommonSchema } from "../schema";
import { NodeCliHelper } from "../nodeHelper";

export class ModelerPostProcessor {

    constructor(protected session: Session<CodeModel>) {
    }

    public process(): void {
        const model = this.session.model;

        this.removeCliShare(model);

        this.adjustChoiceschema(model);
    }

    private removeCliShare(model: CodeModel): void {
        // In case cli is shared by multiple instances during modelerfour, do deep copy
        Helper.enumerateCodeModel(model, (n) => {
            if (!isNullOrUndefined(n.target.language['cli'])) {
                n.target.language['cli'] = CopyHelper.deepCopy(n.target.language['cli']);
            }
        });
    }

    private adjustChoiceschema(model: CodeModel): void {
        // For m4 change: https://github.com/Azure/autorest.modelerfour/pull/310/files
        // If `modelAsString` is not true, it will no longer be regarded as constant, but choice.
        // To make it backward compatiable, for those choices which are constant before(choice.length === 1),
        // we give it a default value and set hidden as true.
        // The following codegen should handle this case.

        // Set schema
        Helper.enumerateCodeModel(model, (n) => {
            const schema = <ChoiceSchema<StringSchema> | SealedChoiceSchema<StringSchema>>n.target;
            if (!isNullOrUndefined(schema.choices) && schema.choices.length === 1) {
                NodeCliHelper.setCliDefaultValue(schema, schema.choices[0].value);
                NodeCliHelper.setHidden(schema, true);
            }
        }, CliCommonSchema.CodeModel.NodeTypeFlag.choiceSchema);

        // Set parameter according to schema 
        Helper.enumerateCodeModel(model, (n) => {
            const parameter = <Parameter>n.target;
            if (!isNullOrUndefined(parameter) && (Helper.isChoiceSchema(parameter.schema) || Helper.isChoiceSchema(parameter.schema))) {
                if (NodeCliHelper.getHidden(parameter.schema, false)) {
                    NodeCliHelper.setHidden(parameter, true);
                }
                const cliDefaultValue = NodeCliHelper.getCliDefaultValue(parameter.schema);
                if (cliDefaultValue !== undefined) {
                    NodeCliHelper.setCliDefaultValue(parameter, cliDefaultValue);
                }
            }
        }, CliCommonSchema.CodeModel.NodeTypeFlag.parameter);
    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("modeler-post-processor-pre");

    const pn = new ModelerPostProcessor(session);
    pn.process();

    Helper.dumper.dumpCodeModel("modeler-post-processor-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
