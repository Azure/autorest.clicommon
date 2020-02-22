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
import { keys, items, values } from "@azure-tools/linq";

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

        let choices = [this.codeModel.schemas.choices, this.codeModel.schemas.sealedChoices];
        
        choices.forEach(arr => {
            arr.forEach(s => {
                this.manager.process({
                    enumSchema: s.language.default.name,
                    target: s,
                });
                s.choices.forEach(ss => {
                    this.manager.process({
                        enumSchema: s.language.default.name,
                        enumValue: ss.language.default.name,
                        target: ss,
                    });
                })
            })
        });

        this.codeModel.schemas.objects.forEach(s => {
            this.manager.process({
                objectSchemaName: s.language.default.name,
                target: s,
            });
            s.properties.forEach(p => {
                this.manager.process({
                    objectSchemaName: s.language.default.name,
                    propertyName: p.language.default.name,
                    target: p,
                })
            });
        });

        for (var group of this.codeModel.operationGroups) {
            this.manager.process({
                operationGroupName: group.language.default.name,
                target: group
            })
            for (var op of group.operations) {
                this.manager.process({
                    operationGroupName: group.language.default.name,
                    operationName: op.language.default.name,
                    target: op
                })
                for (var param of op.request.parameters) {
                    this.manager.process({
                        operationGroupName: group.language.default.name,
                        operationName: op.language.default.name,
                        parameterName: param.language.default.name,
                        target: param
                    })
                }
            }
        }

        return this.codeModel;
    }


}