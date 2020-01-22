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
        "command"?: string;
        "command-description"?: string;
        "parameter-name"?: string;
        "parameter-description"?: string;
    };
    set?: {
        "command"?: string;
        "command-description"?: string;
        "parameter-name"?: string;
        "parameter-description"?: string;
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
    if (where && (where["command"] || where['parameter-name'])) {
        const prohibitedFilters = [
            "model-name",
            "property-name",
            "enum-name",
            "enum-value-name"
        ];
        let error = getFilterError(where, prohibitedFilters, "command");

        if (set !== undefined) {
            const prohibitedSetters = [
                "property-name",
                "property-description",
                "model-name",
                "enum-name",
                "enum-value-name"
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

export class Modifiers {
    codeModel: CodeModel;
    directives: any;

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async process() {
        this.directives = await this.session.getValue("directive");
        let moo = await this.session.getValue("moo");
        this.session.message({Channel:Channel.Warning, Text: "MOO: " + JSON.stringify(moo) });
        this.session.message({Channel:Channel.Warning, Text: "DIRECTIVES: " + JSON.stringify(this.directives) });

        if (this.directives != null) {
            for (const directive of this.directives.filter(each => !each.transform)) {
                const getPatternToMatch = (selector: string | undefined): RegExp | undefined => {
                    return selector? !hasSpecialChars(selector)? new RegExp(`^${selector}$`, "gi"): new RegExp(selector, "gi"): undefined;
                };
                if (isWhereCommandDirective(directive)) {
                    const selectType = directive.select;
                    const groupRegex = getPatternToMatch(directive.where["group"]);
                    const operationRegex = getPatternToMatch(directive.where["operation"]);
                    const parameterRegex = getPatternToMatch(directive.where["parameter-name"]);
                    const modelRegex = getPatternToMatch(directive.where["model"]);
                    const propertyRegex = getPatternToMatch(directive.where["property"]);

                    const parameterReplacer = directive.set !== undefined? directive.set["parameter-name"]: undefined;
                    const paramDescriptionReplacer = directive.set !== undefined? directive.set["parameter-description"]: undefined;
                    const groupReplacer = directive.set !== undefined ? directive.set["name"] : undefined;
                    const groupDescriptionReplacer = directive.set !== undefined? directive.set["description"]: undefined;
                    const operationReplacer = directive.set !== undefined ? directive.set["name"] : undefined;
                    const operationDescriptionReplacer = directive.set !== undefined? directive.set["description"]: undefined;
        
                    this.session.message({Channel:Channel.Warning, Text:serialize(groupRegex) + " " + serialize(groupReplacer)});
                    for (const operationGroup of values(this.codeModel.operationGroups)) {
                        //operation
                        if (operationGroup.language['cli']['name'] != undefined && operationGroup.language["cli"]["name"].match(groupRegex)) {
                            operationGroup.language["cli"]["name"] = groupReplacer? groupRegex? operationGroup.language["cli"]["name"].replace(groupRegex, groupReplacer): groupReplacer : operationGroup["cli"]["name"];
                            operationGroup.language["cli"]["description"] = groupDescriptionReplacer? groupDescriptionReplacer: operationGroup.language["cli"]["description"];
                        }

                        for (const operation of values(operationGroup.operations)) {
                            //operation
                            if (operation.language['cli']['name'] != undefined && operation.language["cli"]["name"].match(operationRegex)) {
                                operation.language["cli"]["name"] = operationReplacer? operationRegex? operation.language["cli"]["name"].replace(operationRegex, operationReplacer): operationReplacer: operation.language["cli"]["name"];
                                operation.language["cli"]["description"] = operationDescriptionReplacer? operationDescriptionReplacer: operation.language["cli"]["description"];
                            }

                            for (const parameter of values(operation.request.parameters)) {
                                if (parameter.language['cli']['name'] != undefined && parameter.language["cli"]["name"].match(parameterRegex)) {
                                    parameter.language["cli"]["name"] = parameterReplacer? parameterRegex? parameter.language["az"]["name"].replace(parameterRegex, parameterReplacer): parameterReplacer: parameter.language["az"]["name"];
                                    parameter.language["cli"]["description"] = paramDescriptionReplacer? paramDescriptionReplacer: parameter.language["az"]["description"];
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
        const plugin = new Modifiers(session);
        const result = await plugin.process();
        host.WriteFile("modifiers-temp-output.yaml", serialize(result));
    } catch (E) {
        if (debug) {
            console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
        }
        throw E;
    }
}
