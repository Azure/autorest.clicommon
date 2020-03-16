import { ChoiceSchema, ChoiceValue, Extensions, CodeModel, ObjectSchema, Operation, OperationGroup, Parameter, Property, SealedChoiceSchema, Schema, ConstantSchema, SchemaType } from "@azure-tools/codemodel";
import { keys, values } from "@azure-tools/linq";
import { isArray, isNull, isNullOrUndefined, isObject, isString, isUndefined } from "util";
import { CliConst, M4Node, M4NodeType, NamingType, CliCommonSchema } from "./schema";
import { pascalCase, EnglishPluralizationService, guid } from '@azure-tools/codegen';
import { Session } from "@azure-tools/autorest-extension-base";
import { PreNamer } from "./plugins/prenamer";


export class Helper {

    private static session: Session<CodeModel>;
    public static init(session: Session<CodeModel>) {
        Helper.session = session;
    }

    public static logDebug(msg: string) {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        Helper.session.debug(msg, []);
    }

    public static logWarning(msg: string) {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        Helper.session.warning(msg, []);
    }

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
            return new RegExp(str, "gi");
        return new RegExp(`^${str}$`, "gi");
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
        eps.addWord('cache', 'caches');
        eps.addWord('Cache', 'Caches');
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
                Helper.isEmptyString(v) ? '_' :
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

        let generatePropertyFlattenValue = (o: any, i: number) => (isNullOrUndefined(o.extensions) || isNullOrUndefined(o.extensions[CliConst.FLATTEN_FLAG])) ? '' :
            (NEW_LINE + tab(i) + CliConst.FLATTEN_FLAG + ': ' + o.extensions[CliConst.FLATTEN_FLAG]);

        let s = '';
        s = s + `operationGroups:${NEW_LINE}` +
            `${tab()}all:${NEW_LINE}`.concat(codeModel.operationGroups.map(
                v => `${tab(1)}- operationGroupName: ${generateCliValue(v, 2)}` +
                    `${NEW_LINE}${tab(2)}operations:${NEW_LINE}`.concat(
                        v.operations.map(vv =>
                            `${tab(2)}- operationName: ${generateCliValue(vv, 3)}` +
                            `${NEW_LINE}${tab(3)}parameters:${NEW_LINE}`.concat(
                                vv.parameters.map(vvv => `${tab(3)}- parameterName: ${generateCliValue(vvv, 4)}${generatePropertyFlattenValue(vvv, 4)}${NEW_LINE}` +
                                    (((!isNullOrUndefined(vvv.protocol?.http?.in)) && vvv.protocol.http.in === 'body')
                                        ? `${tab(4)}bodySchema: ${vvv.schema.language.default.name}${NEW_LINE}` : '')).join('')) +
                            vv.requests.map((req, index) =>
                                isNullOrUndefined(req.parameters) ? '' :
                                    req.parameters.map((vvv) => `${tab(3)}- parameterName[${index}]: ${generateCliValue(vvv, 4)}${generatePropertyFlattenValue(vvv, 4)}${NEW_LINE}` +
                                        (((!isNullOrUndefined(vvv.protocol?.http?.in)) && vvv.protocol.http.in === 'body')
                                            ? `${tab(4)}bodySchema: ${vvv.schema.language.default.name}${NEW_LINE}` : '')).join(''))
                            ).join(''))
                ).join('')
            );

        s = s + `schemas:${NEW_LINE}` +
            `${tab()}objects:${NEW_LINE}` +
            `${tab(1)}all:${NEW_LINE}`.concat(codeModel.schemas.objects.map(
                v => `${tab(2)}- schemaName: ${generateCliValue(v, 3)}` +
                    `${NEW_LINE}${tab(3)}properties:${NEW_LINE}`.concat(
                        isNullOrUndefined(v.properties) ? '' : v.properties.map(vv => `${tab(4)}- propertyName: ${generateCliValue(vv, 5)}${generatePropertyFlattenValue(vv, 5)} ${NEW_LINE}`)
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

    public static isBaseClass(o: ObjectSchema) {
        const DISCRIMINATOR = 'discriminator';

        return !isNullOrUndefined(o[DISCRIMINATOR]);
    }

    public static setFlatten(p: Extensions, isFlatten: boolean, overwrite: boolean) {
        if (isNullOrUndefined(p.extensions))
            p.extensions = {};
        if (isNullOrUndefined(p.extensions[CliConst.FLATTEN_FLAG]) || overwrite) {
            p.extensions[CliConst.FLATTEN_FLAG] = isFlatten;
        }
    }

    public static isFlattened(p: Extensions) {
        return !isNullOrUndefined(p.extensions) && p.extensions[CliConst.FLATTEN_FLAG] == true;
    }

    public static getDefaultValue(schema: Schema) {
        switch (schema.type) {
            case SchemaType.Array:
                return [];
            case SchemaType.Dictionary:
                return {};
            case SchemaType.Boolean:
                return false;
            case SchemaType.Integer:
                return 0;
            case SchemaType.Number:
                return 0;
            case SchemaType.Object:
                return {};
            case SchemaType.String:
                return '';
            case SchemaType.UnixTime:
                return Date.now();
            case SchemaType.ByteArray:
            case SchemaType.Binary:
                return 'BinaryData'
            case SchemaType.Char:
                return ' ';
            case SchemaType.Date:
            case SchemaType.DateTime:
                return Date.now();
            case SchemaType.Duration:
                return 0;
            case SchemaType.Uuid:
                return guid();
            case SchemaType.Uri:
                return 'https://www.microsoft.com';
            case SchemaType.Credential:
                return '********';
            case SchemaType.Any:
                return '<any>';
            case SchemaType.Choice:
                return (schema as ChoiceSchema).choices[0].value;
            case SchemaType.SealedChoice:
                return (schema as SealedChoiceSchema).choices[0].value;
            case SchemaType.Conditional:
                return false;
            case SchemaType.SealedConditional:
                return false;
            case SchemaType.Flag:
                return 0;
            case SchemaType.Constant:
                return 'constant';
            case SchemaType.Or:
                return 'or';
            case SchemaType.Xor:
                return 'xor';
            case SchemaType.Not:
                return 'not';
            case SchemaType.Group:
                return 'group';
            default:
                return 'unknown'
        }
    }

    public static setCliProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.language[CliConst.CLI]))
            node.language[CliConst.CLI] = {};
        node.language[CliConst.CLI][key] = value;
    }

    /**
     * following nodes will be gone through now:
     *   - choice
     *     - value
     *   - sealedChoice
     *     - value
     *   - schemaObject
     *     - property
     *   - OperationGroup
     *     - operation
     *       - parameter
     * @param codeModel
     * @param action
     */
    public static enumerateCodeMode(codeModel: CodeModel, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void) {
        if (isNullOrUndefined(action))
            throw Error("empty action for going through code model")

        let choices = [codeModel.schemas.choices ?? [], codeModel.schemas.sealedChoices ?? []];
        let i = -1;
        choices.forEach(arr => {
            for (i = arr.length - 1; i >= 0; i--) {
                let s = arr[i];
                action({
                    choiceSchemaCliKey: PreNamer.getCliKey(s),
                    parent: arr,
                    target: s,
                    targetIndex: i
                });

                for (let j = s.choices.length - 1; j >= 0; j--) {
                    let ss = s.choices[j];
                    action({
                        choiceSchemaCliKey: PreNamer.getCliKey(s),
                        choiceValueCliKey: PreNamer.getCliKey(ss),
                        parent: s.choices,
                        target: ss,
                        targetIndex: j
                    });
                }
            }
        });

        for (i = codeModel.schemas.objects.length - 1; i >= 0; i--) {
            let s = codeModel.schemas.objects[i];
            action({
                objectSchemaCliKey: PreNamer.getCliKey(s),
                parent: codeModel.schemas.objects,
                target: s,
                targetIndex: i
            });
            if (!isNullOrUndefined(s.properties)) {
                for (let j = s.properties.length - 1; j >= 0; j--) {
                    let p = s.properties[j];
                    action({
                        objectSchemaCliKey: PreNamer.getCliKey(s),
                        propertyCliKey: PreNamer.getCliKey(p),
                        parent: s.properties,
                        target: p,
                        targetIndex: j
                    })
                }
            }
        }

        for (i = codeModel.operationGroups.length - 1; i >= 0; i--) {
            let group = codeModel.operationGroups[i];
            action({
                operationGroupCliKey: PreNamer.getCliKey(group),
                parent: codeModel.operationGroups,
                target: group,
                targetIndex: i,
            })
            for (let j = group.operations.length - 1; j >= 0; j--) {
                let op = group.operations[j];
                action({
                    operationGroupCliKey: PreNamer.getCliKey(group),
                    operationCliKey: PreNamer.getCliKey(op), 
                    parent: group.operations,
                    target: op,
                    targetIndex: j,
                })
                for (let k = op.request.parameters.length - 1; k >= 0; k--) {
                    let param = op.request.parameters[k];
                    action({
                        operationGroupCliKey: PreNamer.getCliKey(group),
                        operationCliKey: PreNamer.getCliKey(op),
                        parameterCliKey: PreNamer.getCliKey(param),
                        parent: op.request.parameters,
                        target: param,
                        targetIndex: k,
                    })
                }
            }
        }
    }

}