import { Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { CliDirectiveManager } from "./cliDirective";
import { isNullOrUndefined } from "util";

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

        let choices = [this.codeModel.schemas.choices ?? [], this.codeModel.schemas.sealedChoices ?? []];
        let i = -1;
        choices.forEach(arr => {
            for (i = arr.length - 1; i >= 0; i--) {
                let s = arr[i];
                this.manager.process({
                    choiceSchemaName: s.language.default.name,
                    parent: arr,
                    target: s,
                    targetIndex: i
                });

                for (let j = s.choices.length - 1; j >= 0; j--) {
                    let ss = s.choices[j];
                    this.manager.process({
                        choiceSchemaName: s.language.default.name,
                        choiceValueName: ss.language.default.name,
                        parent: s.choices,
                        target: ss,
                        targetIndex: j
                    });
                }
            }
        });

        for (i = this.codeModel.schemas.objects.length - 1; i >= 0; i--) {
            let s = this.codeModel.schemas.objects[i];
            this.manager.process({
                objectSchemaName: s.language.default.name,
                parent: this.codeModel.schemas.objects,
                target: s,
                targetIndex: i
            });
            if (!isNullOrUndefined(s.properties)) {
                for (let j = s.properties.length - 1; j >= 0; j--) {
                    let p = s.properties[j];
                    this.manager.process({
                        objectSchemaName: s.language.default.name,
                        propertyName: p.language.default.name,
                        parent: s.properties,
                        target: p,
                        targetIndex: j
                    })
                }
            }
        }

        for (i = this.codeModel.operationGroups.length - 1; i >= 0; i--) {
            let group = this.codeModel.operationGroups[i];
            this.manager.process({
                operationGroupName: group.language.default.name,
                parent: this.codeModel.operationGroups,
                target: group,
                targetIndex: i,
            })
            for (let j = group.operations.length - 1; j >= 0; j--) {
                let op = group.operations[j];
                this.manager.process({
                    operationGroupName: group.language.default.name,
                    operationName: op.language.default.name,
                    parent: group.operations,
                    target: op,
                    targetIndex: j,
                })
                for (let k = op.request.parameters.length - 1; k >= 0; k--) {
                    let param = op.request.parameters[k];
                    this.manager.process({
                        operationGroupName: group.language.default.name,
                        operationName: op.language.default.name,
                        parameterName: param.language.default.name,
                        parent: op.request.parameters,
                        target: param,
                        targetIndex: k,
                    })
                }
            }
        }
        return this.codeModel;
    }

}