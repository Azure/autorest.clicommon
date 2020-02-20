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
import { isNullOrUndefined, isString, isObject, isArray } from "util";
import { keys, items } from "@azure-tools/linq";

export class Modifier {
    private manager: CliDirectiveManager;

    get codeModel() {
        return this.session.model;
    }

    constructor(protected session: Session<CodeModel>) {
    }

    async init(): Promise<Modifier> {
        this.manager = new CliDirectiveManager();
        await this.manager.LoadDirective(this.session);
        return this;
    }

    public process(): CodeModel {

        this.codeModel.schemas.objects.forEach(s => {
            this.manager.process({
                objectSchemaName: s.language.default.name,
                metadata: s,
            });
            s.properties.forEach(p => {
                this.manager.process({
                    objectSchemaName: s.language.default.name,
                    propertyName: p.language.default.name,
                    metadata: p,
                })
            });
        });

        for (var group of this.codeModel.operationGroups) {
            this.manager.process({
                operationGroupName: group.language.default.name,
                metadata: group
            })
            for (var op of group.operations) {
                this.manager.process({
                    operationGroupName: group.language.default.name,
                    operationName: op.language.default.name,
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