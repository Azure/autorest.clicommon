import {
    CodeModel,
    codeModelSchema,
} from "@azure-tools/codemodel";
import {
    Session,
    startSession,
    Host,
} from "@azure-tools/autorest-extension-base";
import { serialize, deserialize } from "@azure-tools/codegen";
import { CliDirectiveManager } from "./cliDirective";

export class Modifier {
    private manager: CliDirectiveManager;

    get codeModel() {
        return this.session.model;
    }

    constructor(protected session: Session<CodeModel>) {
    }

    async init() {
        this.manager = new CliDirectiveManager();
        await this.manager.LoadDirective(this.session);
    }

    public process(): CodeModel {

        // Only operationGroup, operation, parameter SelectType is supported, so only go through operationGroups in code model
        // TODO: perf improvement may be needed in the future in the go-through, let's do it when needed
        for (var group of this.codeModel.operationGroups) {
            this.manager.process({
                operationGroupName: group.language.default.name,
                operationName: '',
                parameterName: '',
                metadata: group
            })
            for (var op of group.operations) {
                this.manager.process({
                    operationGroupName: group.language.default.name,
                    operationName: op.language.default.name,
                    parameterName: '',
                    metadata: op
                })
                for (var param of op.request.parameters) {
                    this.manager.process({
                        operationGroupName: group.language.default.name,
                        operationName: op.language.default.name,
                        parameterName: param.language.default.name,
                        metadata: param
                    })
                }
            }
        }

        return this.codeModel;
    }
}