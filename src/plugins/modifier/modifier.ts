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

    public generateReport(): string {
        const INDENT = 2;
        const GROUP_INDENT = 4;
        const OPERATION_INDENT = 6;
        const PARAM_INDENT = 8;
        let generateValue = (o: any, i: number) => `'${o.language.default.name}'` +
            (isNullOrUndefined(o.language.cli) ? '' : Object.getOwnPropertyNames(o.language.cli)
                .filter(key => o.language.cli[key] !== o.language.default[key])
                .reduce((pv, cv, ci) => pv.concat((ci === 0 ? `\n${' '.repeat(i)}cli:` : '') + `\n${' '.repeat(i + INDENT)}${cv}: ${o.language.cli[cv]}`), ''));

        // TODO: include schema... when we support schema in modifier
        return this.codeModel.operationGroups.map(
            v => `- operationGroup: ${generateValue(v, GROUP_INDENT)}\n`.concat(
                v.operations.map(vv => `  - operation: ${generateValue(vv, OPERATION_INDENT)}\n`.concat(
                    vv.request.parameters.map(vvv => `    - parameter: ${generateValue(vvv, PARAM_INDENT)}\n`)
                        .join(''))
                ).join(''))
        ).join('');
    }
}