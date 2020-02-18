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
        const NEW_LINE = '\n';
        // TODO: refactor the yaml simple parser to helper
        let withIndent = (i: number, s: string = '') => `${' '.repeat(i)}${s}`;
        let nextIndent = (i, level = 1) => i + INDENT * level;
        let formatValue = (o: any, i: number) => {
            if (isString(o))
                return o;
            else if (isArray(o))
                return o.map(v => NEW_LINE + withIndent(i, "- " + formatValue(v, nextIndent(i, 2 /* one more indent for array*/)))).join('');
            else if (isObject(o))
                return keys(o).select(k => NEW_LINE + `${withIndent(i, k)}: ${formatValue(o[k], nextIndent(i))}`).join('');
            else
                return o.toString();
        };
        let generateCliValue = (o: any, i: number) => o.language.default.name +
            (isNullOrUndefined(o.language.cli) ? '' : Object.getOwnPropertyNames(o.language.cli)
                .filter(key => o.language.cli[key] !== o.language.default[key])
                .reduce((pv, cv, ci) => pv.concat((ci === 0 ? NEW_LINE + withIndent(i, 'cli:') : '') +
                    NEW_LINE + `${withIndent(nextIndent(i), cv)}: ${formatValue(o.language.cli[cv], nextIndent(i, 2 /*next next level*/))}`), ''));

        // TODO: include schema... when we support schema in modifier
        let initialIndent = 0;
        return `${withIndent(initialIndent)}operationGroups:${NEW_LINE}`.concat(
            this.codeModel.operationGroups.map(
                v => `${withIndent(initialIndent)}- operationGroupName: ${generateCliValue(v, nextIndent(initialIndent))}` + 
                    `${NEW_LINE}${withIndent(nextIndent(initialIndent))}operations:${NEW_LINE}`.concat(
                        v.operations.map(vv => `${withIndent(nextIndent(initialIndent))}- operationName: ${generateCliValue(vv, nextIndent(initialIndent, 2))}` + 
                        `${NEW_LINE}${withIndent(nextIndent(initialIndent,2))}parameters:${NEW_LINE}`.concat(
                            vv.request.parameters.map(vvv => `${withIndent(nextIndent(initialIndent, 2))}- parameterName: ${generateCliValue(vvv, nextIndent(initialIndent, 3))}` + NEW_LINE)
                            .join(''))
                    ).join(''))
            ).join(''));
    }
}