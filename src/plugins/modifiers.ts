import {
    CodeModel,
    codeModelSchema,
    ObjectSchema,
    SchemaType,
    Property
} from "@azure-tools/codemodel";
import {
    Session,
    startSession,
    Host,
    Channel
} from "@azure-tools/autorest-extension-base";
import { serialize, deserialize } from "@azure-tools/codegen";
import { values, items, length, Dictionary } from "@azure-tools/linq";

let directives: Array<any> = [];

interface WhereCommandDirective {
    select?: string;
    where: {
        "group"?: string;
        "operation"?: string;
        "parameter"?: string;
        "model"?: string;
        "property"?: string;
    };
    set?: {
        "name"?: string;
        "description"?: string;
        default?: {
            name: string;
            description: string;
        };
    };
}

function getFilterError(
    whereObject: any,
    prohibitedFilters: Array<string>,
    selectionType: string
): string {
    let error = "";
    for (const each of values(prohibitedFilters)) {
        if (whereObject[each] !== undefined) {
            error += `Can't filter by ${each} when selecting command. `;
        }
    }

    return error;
}

function getSetError(
    setObject: any,
    prohibitedSetters: Array<string>,
    selectionType: string
): string {
    let error = "";
    for (const each of values(prohibitedSetters)) {
        if (setObject[each] !== undefined) {
            error += `Can't set ${each} when a ${selectionType} is selected. `;
        }
    }

    return error;
}

function isWhereCommandDirective(it: any): it is WhereCommandDirective {
    const directive = it;
    const where = directive.where;
    const set = directive.set;
    if (where && (where["group"] || where['operation'] || where['parameter-name'] || where['model'] || where['property'])) {
        const prohibitedFilters = [
        ];
        let error = getFilterError(where, prohibitedFilters, "command");

        if (set !== undefined) {
            const prohibitedSetters = [
            ];
            error += getSetError(set, prohibitedSetters, "command");
        }

        if (error) {
            throw Error(
                `Incorrect Directive: ${JSON.stringify(it, null, 2)}. Reason: ${error}.`
            );
        }

        return true;
    }

    return false;
}

function hasSpecialChars(str: string): boolean {
    return !/^[a-zA-Z0-9]+$/.test(str);
}

export class CommonModifiers {
    codeModel: CodeModel;
    directives: any;

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async process() {
        this.directives = await this.session.getValue("directive");

        if (this.directives != null) {
            for (const directive of this.directives.filter(each => !each.transform)) {
                const getPatternToMatch = (selector: string | undefined): RegExp | undefined => {
                    return selector? !hasSpecialChars(selector)? new RegExp(`^${selector}$`, "gi"): new RegExp(selector, "gi"): undefined;
                };

                if (isWhereCommandDirective(directive)) {
                    const selectType = directive.select;
                    const groupRegex = getPatternToMatch(directive.where["group"]);
                    const operationRegex = getPatternToMatch(directive.where["operation"]);
                    const parameterRegex = getPatternToMatch(directive.where["parameter"]);
                    const modelRegex = getPatternToMatch(directive.where["model"]);
                    const propertyRegex = getPatternToMatch(directive.where["property"]);


                    const parameterReplacer = directive.set !== undefined? directive.set["name"]: undefined;
                    const parameterDescriptionReplacer = directive.set !== undefined? directive.set["description"]: undefined;
                    const groupReplacer = directive.set !== undefined ? directive.set["name"] : undefined;
                    const groupDescriptionReplacer = directive.set !== undefined? directive.set["description"]: undefined;
                    const operationReplacer = directive.set !== undefined ? directive.set["name"] : undefined;
                    const operationDescriptionReplacer = directive.set !== undefined? directive.set["description"]: undefined;

                    for (const operationGroup of values(this.codeModel.operationGroups)) {

                        if (groupRegex && !operationRegex && !parameterRegex && !modelRegex && !propertyRegex) {
                            if (operationGroup.language['cli']['name'] != undefined && operationGroup.language["cli"]["name"].match(groupRegex)) {

                                operationGroup.language["cli"]["name"] = groupReplacer? groupRegex? operationGroup.language["cli"]["name"].replace(groupRegex, groupReplacer): groupReplacer : operationGroup.language["cli"]["name"];
                                operationGroup.language["cli"]["description"] = groupDescriptionReplacer? groupDescriptionReplacer: operationGroup.language["cli"]["description"];
                            }
                        }

                        for (const operation of values(operationGroup.operations)) {
                            if (operationRegex && !parameterRegex && !modelRegex && !propertyRegex) {
                                if (operation.language['cli']['name'] != undefined && operation.language["cli"]["name"].match(operationRegex)) {
                                    operation.language["cli"]["name"] = operationReplacer? operationRegex? operation.language["cli"]["name"].replace(operationRegex, operationReplacer): operationReplacer: operation.language["cli"]["name"];
                                    operation.language["cli"]["description"] = operationDescriptionReplacer? operationDescriptionReplacer: operation.language["cli"]["description"];
                                }
                            }

                            for (const parameter of values(operation.request.parameters)) {
                                if (parameterRegex) {

                                    if (parameter.language['cli']['name'] != undefined && parameter.language["cli"]["name"].match(parameterRegex)) {
                                        parameter.language["cli"]["name"] = parameterReplacer? parameterRegex? parameter.language["cli"]["name"].replace(parameterRegex, parameterReplacer): parameterReplacer: parameter.language["cli"]["name"];
                                        parameter.language["cli"]["description"] = parameterDescriptionReplacer? parameterRegex? parameter.language["cli"]["description"].replace(parameterRegex, parameterDescriptionReplacer): parameterDescriptionReplacer: parameter.language["cli"]["description"];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return this.codeModel;
    }
}

export async function processRequest(host: Host) {
    const debug = (await host.GetValue("debug")) || false;

    try {
        const session = await startSession<CodeModel>(host, {}, codeModelSchema);
        const plugin = new CommonModifiers(session);
        const result = await plugin.process();
        host.WriteFile("modifiers-code-model-v4-cli.yaml", serialize(result));
    } catch (E) {
        if (debug) {
            console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
        }
        throw E;
    }
}
