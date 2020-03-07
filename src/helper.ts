import { ChoiceSchema, ChoiceValue, CodeModel, ObjectSchema, Operation, OperationGroup, Parameter, Property, SealedChoiceSchema, Schema, ConstantSchema, SchemaType } from "@azure-tools/codemodel";
import { keys } from "@azure-tools/linq";
import { isArray, isNull, isNullOrUndefined, isObject, isString, isUndefined } from "util";
import { CliConst, M4Node, M4NodeType, NamingType, CliCommonSchema } from "./schema";
import { pascalCase, EnglishPluralizationService } from '@azure-tools/codegen';
import {DependencyModel} from "./models/DependencyModel";


export class Helper {
    public static isEmptyString(str): boolean {
        return isNullOrUndefined(str) || str.length === 0;
    }

    /**
     * not in [a-zA-Z0-9] is treated as Special Char
     * @param str
     */
    public static containsSpecialChar(str: string): boolean {
        return !/^[a-zA-Z0-9_]+$/.test(str);
    }

    /**
     * if both regex and str are null/undefiend, return true
     * if either regex and str are null/undefiend, return false
     * else follow normal regex rule
     * @param regex
     * @param str
     */
    public static matchRegex(regex: RegExp, str: string): boolean {
        if (isNullOrUndefined(regex) && isNullOrUndefined(str))
            return true;
        if (isNullOrUndefined(regex) || isNullOrUndefined(str))
            return false;
        return regex.test(str);
    }

    /**
     * if str is empty, refer to the comments of emptyAsMatchAll param
     * if no special char in str (not a-zA-Z0-9), do whole string match
     * if str = '*', match all
     * otherwise follow normal regex rule for whole string ('^...$')
     * @param str
     * @param emptyAsMatchAll 
     *  set to 'true' to return MatchAll regex when str is null/undefined/string.empty
     *  set to 'false' to return null when str is null/undefined/string.empty
     */
    public static createRegex(str: string, emptyAsMatchAll: boolean = false): RegExp {
        let MATCH_ALL = /^.*$/g;
        if (isNullOrUndefined(str) || str.length === 0) {
            if (emptyAsMatchAll)
                return MATCH_ALL;
            else
                return null;
        }
        if (str === "*")
            return MATCH_ALL;
        if (Helper.containsSpecialChar(str))
            return new RegExp(str);
        return new RegExp(`^${str}$`, "g");
    }

    public static validateNullOrUndefined(obj: any, name: string): void {
        if (isNullOrUndefined(obj))
            throw Error(`Validation failed: '${name}' is null or undefined`)
    }

    public static ToNamingType(node: M4Node): NamingType | null {

        if (node instanceof OperationGroup)
            return CliConst.NamingType.operationGroup;
        else if (node instanceof Operation)
            return CliConst.NamingType.operation;
        else if (node instanceof Parameter) {
            // workaround for modelerfour's bug, the naming convention is not applied to flattened parameter
            // https://github.com/Azure/autorest.modelerfour/issues/195
            if (node['flattened'] === true)
                return null;
            return node.schema?.type === SchemaType.Constant ? CliConst.NamingType.constant : CliConst.NamingType.parameter;
        }
        else if (node instanceof ChoiceSchema)
            return CliConst.NamingType.choice;
        else if (node instanceof SealedChoiceSchema)
            return CliConst.NamingType.choice;
        else if (node instanceof ConstantSchema)
            return CliConst.NamingType.constant;
        else if (node instanceof ChoiceValue)
            return CliConst.NamingType.choiceValue;
        // Treat other schema type as 'type' like 'string, 'number', 'array', 'dictionary', 'object'...
        else if (node instanceof Schema)
            return CliConst.NamingType.type;
        else if (node instanceof Property)
            return CliConst.NamingType.property;
        return null;
    }

    public static ToM4NodeType(node: M4Node): M4NodeType {
        if (node instanceof OperationGroup)
            return CliConst.SelectType.operationGroup;
        else if (node instanceof Operation)
            return CliConst.SelectType.operation;
        else if (node instanceof Parameter)
            return CliConst.SelectType.parameter;
        else if (node instanceof ObjectSchema)
            return CliConst.SelectType.objectSchema;
        else if (node instanceof Property)
            return CliConst.SelectType.property;
        else if (node instanceof ChoiceSchema)
            return CliConst.SelectType.choiceSchema;
        else if (node instanceof SealedChoiceSchema)
            return CliConst.SelectType.choiceSchema;
        else if (node instanceof ChoiceValue)
            return CliConst.SelectType.choiceValue;
        throw Error(`Unsupported node type: ${typeof (node)}`);
    }

    public static singularize(settings: CliCommonSchema.NamingConvention, word: string): string {
        let low = word.toLowerCase();
        if (settings.glossary.findIndex(v => v === low) >= 0)
            return word;

        const eps = new EnglishPluralizationService();
        eps.addWord('Database', 'Databases');
        eps.addWord('database', 'databases');
        return eps.singularize(word);
    }

    public static normalizeNamingSettings(settings: CliCommonSchema.NamingConvention) {
        if (isNullOrUndefined(settings.singularize))
            settings.singularize = [];
        if (isNullOrUndefined(settings.glossary))
            settings.glossary = [];
        else
            settings.glossary = settings.glossary.map(v => v.toLowerCase());
        if (isNullOrUndefined(settings.override))
            settings.override = {};
        else {
            for (let key in settings.override)
                settings.override[key.toLowerCase()] = settings.override[key];
        }
        if (isNullOrUndefined(settings.appliedTo)) {
            settings.appliedTo = ['name'];
        }
        return settings;
    }

    /**
     * Remark: Please make sure the singularize, glossary, appliedTo and override is set to [] or {} instead of null or undefined when calling this method
     * No check for them will be done in this method for better performance. exception may be thrown if they are null or undefiend.
     * You can call Helper.normalizeNamingSettings to do these normalization
     * @param settings
     * @param node
     * @param languageKey
     */
    public static applyNamingConvention(settings: CliCommonSchema.NamingConvention, node: M4Node, languageKey: string) {
        if (isNullOrUndefined(node.language[languageKey]))
            return;

        let namingType = Helper.ToNamingType(node);
        if (isNullOrUndefined(namingType)) {
            // unsupported modelerfour node for naming type, ignore it for now
            return;
        }

        let style = settings[namingType];
        let single = settings.singularize.includes(namingType) === true;

        if (Helper.isEmptyString(style)) {
            // Only process when naming convention is set
            return;
        }

        let up1 = (n: string) => Helper.isEmptyString(n) ? n : n.length == 1 ? n.toUpperCase() : n[0].toUpperCase().concat(n.substr(1).toLowerCase());
        let op = {};
        op[CliConst.NamingStyle.camel] = {
            wording: (v: string, i: number) => i === 0 ? v.toLowerCase() : up1(v),
            sep: '',
        };
        op[CliConst.NamingStyle.pascal] = {
            wording: (v: string, i: number) => up1(v),
            sep: '',
        };
        op[CliConst.NamingStyle.kebab] = {
            wording: (v: string, i: number) => v.toLowerCase(),
            sep: '-',
        };
        op[CliConst.NamingStyle.snake] = {
            wording: (v: string, i: number) => v.toLowerCase(),
            sep: '_',
        };
        op[CliConst.NamingStyle.space] = {
            wording: (v: string, i: number) => v.toLowerCase(),
            sep: ' ',
        };
        op[CliConst.NamingStyle.upper] = {
            wording: (v: string, i: number) => v.toUpperCase(),
            sep: '_',
        };

        let convert = (oldName) => {
            if (Helper.isEmptyString(oldName))
                return oldName;

            // the oldName should be in snake_naming_convention
            const SEP = '_';
            let newName = oldName.split(SEP).map((v, i) =>
                (!isNullOrUndefined(settings.override[v.toLowerCase()]))
                    ? settings.override[v.toLowerCase()]
                    : op[style].wording(single ? Helper.singularize(settings, v) : v, i)
            ).join(op[style].sep);
            return newName;
        };


        settings.appliedTo.forEach(field => {
            let v = node.language[languageKey][field];
            if (isNullOrUndefined(v))
                return;
            else if (isString(v)) {
                node.language[languageKey][field] = convert(v);
            }
            else if (isArray(v)) {
                // exception will be thrown if it's not an string arry, don't do the check explicitly for better perf
                node.language[languageKey][field] = v.map((item) => convert(item));
            }
            else {
                throw Error("Only string or string array is supported for naming convention");
            }
        });
    }

    public static toYamlSimplified(codeModel: CodeModel): string {
        const INDENT = '  ';
        const NEW_LINE = '\n';
        let initialIndent = 1;
        let tab = (extra: number = 0) => INDENT.repeat(initialIndent + extra);
        let formatValue = (o: any, i: number) => {
            if (isString(o))
                return o;
            else if (isArray(o))
                return o.map(v => NEW_LINE + tab(i) + "- " + formatValue(v, i + 2/* one more indent for array*/)).join('');
            else if (isObject(o))
                return keys(o).select(k => NEW_LINE + tab(i) + `${k}: ${formatValue(o[k], i + 1)}`).join('');
            else
                return isUndefined(o) ? '{undefined}' : isNull(o) ? '{null}' : o.toString();
        };

        let generateCliValue = (o: any, i: number) => o.language.default.name +
            (isNullOrUndefined(o.language.cli) ? '' : Object.getOwnPropertyNames(o.language.cli)
                .filter(key => o.language.cli[key] !== o.language.default[key])
                .reduce((pv, cv, ci) => pv.concat((ci === 0 ? (NEW_LINE + tab(i) + 'cli:') : '') +
                    NEW_LINE + tab(i + 1) + `${cv}: ${formatValue(o.language.cli[cv], i + 2)}`), ''));

        let s = '';
        s = s + `operationGroups:${NEW_LINE}` +
            `${tab()}all:${NEW_LINE}`.concat(codeModel.operationGroups.map(
                v => `${tab(1)}- operationGroupName: ${generateCliValue(v, 2)}` +
                    `${NEW_LINE}${tab(2)}operations:${NEW_LINE}`.concat(
                        v.operations.map(vv => `${tab(2)}- operationName: ${generateCliValue(vv, 3)}` +
                            `${NEW_LINE}${tab(3)}parameters:${NEW_LINE}`.concat(
                                vv.request.parameters.map(vvv => `${tab(3)}- parameterName: ${generateCliValue(vvv, 4)}${NEW_LINE}` +
                                    (((!isNullOrUndefined(vvv.protocol?.http?.in)) && vvv.protocol.http.in === 'body') ? `${tab(4)}bodySchema: ${vvv.schema.language.default.name}${NEW_LINE}` : ''))
                                    .join(''))).join(''))).join(''));
        s = s + `schemas:${NEW_LINE}` +
            `${tab()}objects:${NEW_LINE}` +
            `${tab(1)}all:${NEW_LINE}`.concat(codeModel.schemas.objects.map(
                v => `${tab(2)}- schemaName: ${generateCliValue(v, 3)}` +
                    `${NEW_LINE}${tab(3)}properties:${NEW_LINE}`.concat(
                        isNullOrUndefined(v.properties) ? '' : v.properties.map(vv => `${tab(4)}- propertyName: ${generateCliValue(vv, 5)}${NEW_LINE}`)
                            .join('')))
                .join(''));
        s = s + `${tab()}choices:${NEW_LINE}` +
            `${tab(1)}all:${NEW_LINE}`.concat(
                [codeModel.schemas.choices ?? [], codeModel.schemas.sealedChoices ?? []].map((arr: any[]) => arr.map(
                    v => `${tab(2)}- choiceName: ${generateCliValue(v, 3)}` +
                        `${NEW_LINE}${tab(3)}choiceValues:${NEW_LINE}`.concat(
                            isNullOrUndefined(v.choices) ? '' : v.choices.map(vv => `${tab(4)}- choiceValue: ${generateCliValue(vv, 5)}${NEW_LINE}`)
                                .join(''))).join('')).join(''));
        return s;
    }

    public static resolveDependencies(codeModel: CodeModel): DependencyModel[]{
        let dependencies: DependencyModel[] = [];
        let operationGroups = codeModel.operationGroups;

        function hasCreateMethod(operationGroup: OperationGroup) {
            for (let operation of operationGroup.operations) {
                if (operation.language.default.name === 'Create' || operation.language.default.name === 'CreateOrUpdate') {
                    return true;
                }
            }
            return false;
        }

        function convertPluralToSingular(name: string) {
            if (name.endsWith("ies"))   {
                name = name.substring(0, name.length - 3) + "y";
            }
            else if (name.toLowerCase().endsWith("xes")) {
                name = name.substring(0, name.length - 2);
            }
            else if (name.endsWith('s')) {
                name = name.substring(0, name.length - 1);
            }
            return name;
        }

        function toSnakeCase(v: string) {
            let snake: string = v.replace(/([a-z](?=[A-Z]))/g, '$1 ').split(' ').join('_').toLowerCase();
            return snake;
        }

        for (let operationGroup of operationGroups) {
            if (!hasCreateMethod(operationGroup)) continue;
            dependencies.push(new DependencyModel(operationGroup.$key, toSnakeCase(convertPluralToSingular(operationGroup.$key))));
        }

        function getDependedResourcesFromUrl(resource: DependencyModel, url: string) {
            url = url.trim();
            let urls = url.split('/');
            // /subscriptions/9760acf5-4638-11e7-9bdb-020073ca7778/resourceGroups/myRP/providers/Microsoft.Network/virtualNetworks/testvnet3/subnets/testsubnet3
            for (let i = 3; i < urls.length; i = i + 2) {
                if (urls[i] === 'providers') continue;
                if(!resource.externalDependedResourcesSet.has(toSnakeCase(convertPluralToSingular(urls[i])))) {
                    resource.externalDependedResourcesSet.add(toSnakeCase(convertPluralToSingular(urls[i])));
                    resource.externalDependedResources.push(toSnakeCase(convertPluralToSingular(urls[i])));
                }

            }
        }

        function getDependedResourcesFromParameters(resource: DependencyModel, parameters: any) {
            for (let key in parameters) {
                if (key.toLowerCase().startsWith('subscription')) continue;
                if ((typeof parameters[key]) === 'object') getDependedResourcesFromParameters(resource, parameters[key]);
                else if (key.toLowerCase().endsWith('name') || key.toLowerCase().endsWith('id')) {
                    let value = parameters[key] as string;
                    if (value.startsWith('/subscriptions')) {
                        getDependedResourcesFromUrl(resource, value);
                    }
                    let dependedResource = key.substring(0, key.length - 4);
                    if (key.toLowerCase().endsWith('id'))
                        dependedResource = key.substring(0, key.length - 2);
                    dependedResource = toSnakeCase(dependedResource);
                    if (dependedResource === resource.resourceName) continue;
                    let isInternalDependency = false;
                    for (let r of dependencies) {
                        if (r.resourceName === dependedResource) {
                            if (!resource.internalDependedResourcesSet.has(r.resourceName)) {
                                resource.internalDependedResourcesSet.add(r.resourceName);
                                resource.internalDependedResources.push(r.resourceName);
                                isInternalDependency = true;
                            }
                            break;
                        }
                    }
                    if (!isInternalDependency) {
                        if(!resource.externalDependedResourcesSet.has(dependedResource)) {
                            resource.externalDependedResourcesSet.add(dependedResource);
                            resource.externalDependedResources.push(dependedResource);
                        }

                    }
                }
            }
        }

        for (let resource of dependencies) {
            let operationGroup = codeModel.getOperationGroup(resource.operationGroup);
            let createMethod: Operation;
            for (let operation of operationGroup.operations) {
                if (operation.language.default.name === 'Create' || operation.language.default.name === 'CreateOrUpdate') {
                    createMethod = operation;
                    break;
                }
            }
            if (createMethod.extensions === undefined || createMethod.extensions["x-ms-examples"] === undefined) continue;
            let examples = createMethod.extensions["x-ms-examples"];
            for (let exampleKey in examples) {
                let example = examples[exampleKey];
                let parameters = example["parameters"];
                if (parameters === undefined) continue;
                getDependedResourcesFromParameters(resource, parameters);
            }
        }
        return dependencies;
    }
}