import { codeModelSchema, ChoiceSchema, ChoiceValue, CodeModel, ObjectSchema, Operation, OperationGroup, Parameter, Property, SealedChoiceSchema, Schema, ConstantSchema, SchemaType, StringSchema, DictionarySchema, ArraySchema, AnySchema } from "@azure-tools/codemodel";
import { isArray, isNullOrUndefined, isString } from "util";
import { CliConst, M4Node, M4NodeType, NamingType, CliCommonSchema } from "./schema";
import { EnglishPluralizationService, guid } from '@azure-tools/codegen';
import { Session, Host, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { NodeCliHelper, NodeExtensionHelper } from "./nodeHelper";
import { Dumper } from "./dumper";

export class Helper {

    private static session: Session<CodeModel>;
    private static host: Host;
    private static _dumper: Dumper;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static modelerfourOptions: any;

    public static async init(host: Host): Promise<Session<CodeModel>> {
        Helper.session = await startSession<CodeModel>(host, {}, codeModelSchema);
        Helper.host = host;
        Helper._dumper = await (new Dumper(host, Helper.session)).init();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Helper.modelerfourOptions = <any>await Helper.session.getValue('modelerfour', {});
        return Helper.session;
    }

    public static get dumper(): Dumper {
        if (isNullOrUndefined(Helper._dumper))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        return Helper._dumper;
    }

    public static logDebug(msg: string): void {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        Helper.session.debug(msg, []);
    }

    public static logWarning(msg: string): void {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        Helper.session.warning(msg, []);
    }

    public static logError(msg: string): void {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        Helper.session.error(msg, []);
    }

    public static outputToModelerfour(): void {
        if (isNullOrUndefined(Helper.session))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");
        if (isNullOrUndefined(Helper.host))
            throw Error("Helper not init yet, please call Helper.init() to init the Helper");

        // write the final result first which is hardcoded in the Session class to use to build the model..
        // overwrite the modelerfour which should be fine considering our change is backward compatible
        if (Helper.modelerfourOptions['emit-yaml-tags'] !== false) {
            Helper.host.WriteFile('code-model-v4.yaml', serialize(Helper.session.model, codeModelSchema), undefined, 'code-model-v4');
        }
        if (Helper.modelerfourOptions['emit-yaml-tags'] !== true) {
            Helper.host.WriteFile('code-model-v4-no-tags.yaml', serialize(Helper.session.model), undefined, 'code-model-v4-no-tags');
        }
    }

    public static isEmptyString(str: string): boolean {
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
    public static createRegex(str: string, emptyAsMatchAll = false): RegExp {
        const MATCH_ALL = /^.*$/g;
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

    public static ToNamingType(node: M4Node): NamingType | null {

        if (Helper.isOperationGroup(node))
            return CliConst.NamingType.operationGroup;
        else if (Helper.isOperation(node))
            return CliConst.NamingType.operation;
        else if (Helper.isParameter(node)) {
            // workaround for modelerfour's bug, the naming convention is not applied to flattened parameter
            // https://github.com/Azure/autorest.modelerfour/issues/195
            if (node['flattened'] === true)
                return null;
            return (<Parameter>node).schema?.type === SchemaType.Constant ? CliConst.NamingType.constant : CliConst.NamingType.parameter;
        }
        else if (Helper.isChoiceSchema(node))
            return CliConst.NamingType.choice;
        else if (Helper.isSealedChoiceSchema(node))
            return CliConst.NamingType.choice;
        else if (Helper.isConstantSchema(node))
            return CliConst.NamingType.constant;
        else if (Helper.isChoiceValue(node))
            return CliConst.NamingType.choiceValue;
        // Treat other schema type as 'type' like 'string, 'number', 'array', 'dictionary', 'object'...
        else if (Helper.isSchema(node))
            return CliConst.NamingType.type;
        else if (Helper.isProperty(node))
            return CliConst.NamingType.property;
        return null;
    }

    public static ToM4NodeType(node: M4Node): M4NodeType {
        if (Helper.isOperationGroup(node))
            return CliConst.SelectType.operationGroup;
        else if (Helper.isOperation(node))
            return CliConst.SelectType.operation;
        else if (Helper.isParameter(node))
            return CliConst.SelectType.parameter;
        else if (Helper.isObjectSchema(node))
            return CliConst.SelectType.objectSchema;
        else if (Helper.isProperty(node))
            return CliConst.SelectType.property;
        else if (Helper.isChoiceSchema(node))
            return CliConst.SelectType.choiceSchema;
        else if (Helper.isSealedChoiceSchema(node))
            return CliConst.SelectType.choiceSchema;
        else if (Helper.isChoiceValue(node))
            return CliConst.SelectType.choiceValue;
        throw Error(`Unsupported node type: ${typeof (node)}`);
    }

    public static singularize(settings: CliCommonSchema.NamingConvention, word: string): string {
        const low = word.toLowerCase();
        if (settings.glossary.findIndex(v => v === low) >= 0)
            return word;

        const eps = new EnglishPluralizationService();
        eps.addWord('Database', 'Databases');
        eps.addWord('database', 'databases');
        eps.addWord('cache', 'caches');
        eps.addWord('Cache', 'Caches');
        return eps.singularize(word);
    }

    public static normalizeNamingSettings(settings: CliCommonSchema.NamingConvention): CliCommonSchema.NamingConvention {
        if (isNullOrUndefined(settings.singularize))
            settings.singularize = [];
        if (isNullOrUndefined(settings.glossary))
            settings.glossary = [];
        else
            settings.glossary = settings.glossary.map(v => v.toLowerCase());
        if (isNullOrUndefined(settings.override))
            settings.override = {};
        else {
            for (const key in settings.override)
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
    public static applyNamingConvention(settings: CliCommonSchema.NamingConvention, node: M4Node, languageKey: string): void {
        if (isNullOrUndefined(node.language[languageKey]))
            return;

        const namingType = Helper.ToNamingType(node);
        if (isNullOrUndefined(namingType)) {
            // unsupported modelerfour node for naming type, ignore it for now
            return;
        }

        const style = settings[namingType];
        const single = settings.singularize.includes(namingType) === true;

        if (Helper.isEmptyString(style)) {
            // Only process when naming convention is set
            return;
        }

        const up1 = (n: string) => Helper.isEmptyString(n) ? n : n.length == 1 ? n.toUpperCase() : n[0].toUpperCase().concat(n.substr(1).toLowerCase());
        const op = {};
        op[CliConst.NamingStyle.camel] = {
            wording: (v: string, i: number) => i === 0 ? v.toLowerCase() : up1(v),
            sep: '',
        };
        op[CliConst.NamingStyle.pascal] = {
            wording: (v: string) => up1(v),
            sep: '',
        };
        op[CliConst.NamingStyle.kebab] = {
            wording: (v: string) => v.toLowerCase(),
            sep: '-',
        };
        op[CliConst.NamingStyle.snake] = {
            wording: (v: string) => v.toLowerCase(),
            sep: '_',
        };
        op[CliConst.NamingStyle.space] = {
            wording: (v: string) => v.toLowerCase(),
            sep: ' ',
        };
        op[CliConst.NamingStyle.upper] = {
            wording: (v: string) => v.toUpperCase(),
            sep: '_',
        };

        const convert = (oldName) => {
            if (Helper.isEmptyString(oldName))
                return oldName;

            // the oldName should be in snake_naming_convention
            const SEP = '_';
            const newName = oldName.split(SEP).map((v, i) =>
                Helper.isEmptyString(v) ? '_' :
                    (!isNullOrUndefined(settings.override[v.toLowerCase()]))
                        ? settings.override[v.toLowerCase()]
                        : op[style].wording(single ? Helper.singularize(settings, v) : v, i)
            ).join(op[style].sep);
            return newName;
        };


        settings.appliedTo.forEach(field => {
            const v = node.language[languageKey][field];
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static getDefaultValue(schema: Schema): any {
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
                return 'BinaryData';
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
                return 'unknown';
        }
    }

    public static createPolyOperationDefaultName(baseOperation: Operation, discriminatorValue: string): string {
        return `${baseOperation.language.default.name}_${discriminatorValue}`;
    }

    public static createPolyOperationCliKey(baseOperation: Operation, discriminatorValue: string): string {
        return `${NodeCliHelper.getCliKey(baseOperation, baseOperation.language.default.name)}#${discriminatorValue}`;
    }
    
    public static createPolyOperationCliName(baseOperation: Operation, discriminatorValue: string): string {
        return `${NodeCliHelper.getCliName(baseOperation, baseOperation.language.default.name)}#${discriminatorValue}`;
    }

    public static createSplitOperationCliKey(baseOperation: Operation, splitName: string): string {
        return `${NodeCliHelper.getCliKey(baseOperation, baseOperation.language.default.name)}#${splitName}`;
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
     *       - extension
     *         - cli-operations
     * @param codeModel
     * @param action
     */
    public static enumerateCodeModel(codeModel: CodeModel, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag = null): void {
        if (isNullOrUndefined(action)) {
            throw Error("empty action for going through code model");
        }
            
        // choice/sealedChoice/choiceValue
        if (isNullOrUndefined(flag) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.choiceSchema) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.choiceValue)) {
            Helper.enumerateChoices(codeModel.schemas.choices ?? [], action, flag);
            Helper.enumerateChoices(codeModel.schemas.sealedChoices ?? [], action, flag);
        }

        // schemaObject/property
        if (isNullOrUndefined(flag) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.objectSchema) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.property)) {
            Helper.enumrateSchemas(codeModel.schemas.objects, action, flag);
        }

        // operationGroup/operation/parameter
        if (isNullOrUndefined(flag) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.operationGroup) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.operation) || (flag & CliCommonSchema.CodeModel.NodeTypeFlag.parameter)) {
            Helper.enumrateOperationGroups(codeModel.operationGroups, action, flag);
        }
    }

    public static enumerateChoices(choices: ChoiceSchema<StringSchema>[] | SealedChoiceSchema<StringSchema>[], action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumSchema = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.choiceSchema) > 0);
        const cliKeyMissing = '<clikey-missing>';

        for (let i = choices.length - 1; i >= 0; i--) {
            const choice = choices[i];
            if (enumSchema) {
                action({
                    choiceSchemaCliKey: NodeCliHelper.getCliKey(choice, cliKeyMissing),
                    parent: choices,
                    target: choice,
                    targetIndex: i
                });
            }

            Helper.enumerateChoiceValues(choice, action, flag);
        }
    }

    public static enumerateChoiceValues(choice: ChoiceSchema<StringSchema> | SealedChoiceSchema<StringSchema>, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumValue = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.choiceValue) > 0);
        const cliKeyMissing = '<clikey-missing>';

        for (let j = choice.choices.length - 1; j >= 0; j--) {
            const choiceValue = choice.choices[j];
            if (enumValue) {
                action({
                    choiceSchemaCliKey: NodeCliHelper.getCliKey(choice, cliKeyMissing),
                    choiceValueCliKey: NodeCliHelper.getCliKey(choiceValue, cliKeyMissing),
                    parent: choice.choices,
                    target: choiceValue,
                    targetIndex: j
                });
            }
        }
    }

    public static enumrateSchemas(schemas: ObjectSchema[], action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumObjectSchema = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.objectSchema) > 0);
        const cliKeyMissing = '<clikey-missing>';
        if (isNullOrUndefined(schemas)) {
            return;
        }

        for (let i = schemas.length - 1; i >= 0; i--) {
            const schema = schemas[i];
            if (enumObjectSchema) {
                action({
                    objectSchemaCliKey: NodeCliHelper.getCliKey(schema, cliKeyMissing),
                    parent: schemas,
                    target: schema,
                    targetIndex: i
                });
            }
            Helper.enumrateSchemaProperties(schema, action, flag);
        }
    }

    public static enumrateSchemaProperties(schema: ObjectSchema, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumProperty = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.property) > 0);
        if (isNullOrUndefined(schema.properties)) {
            return;
        }
        const cliKeyMissing = '<clikey-missing>';
        for (let j = schema.properties.length - 1; j >= 0; j--) {
            const prop = schema.properties[j];
            if (enumProperty) {
                action({
                    objectSchemaCliKey: NodeCliHelper.getCliKey(schema, cliKeyMissing),
                    propertyCliKey: NodeCliHelper.getCliKey(prop, cliKeyMissing),
                    parent: schema.properties,
                    target: prop,
                    targetIndex: j
                });
            }
        }
    }

    public static enumrateOperationGroups(groups: OperationGroup[], action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumGroup = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.operationGroup) > 0);
        const cliKeyMissing = '<clikey-missing>';
        if (isNullOrUndefined(groups)) {
            return;
        }

        for (let i = groups.length - 1; i >= 0; i--) {
            const group = groups[i];
            if (enumGroup) {
                action({
                    operationGroupCliKey: NodeCliHelper.getCliKey(group, cliKeyMissing),
                    parent: groups,
                    target: group,
                    targetIndex: i,
                });
            }
            Helper.enumrateOperations(group, action, flag);
        }
    }

    public static enumrateOperations(group: OperationGroup, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumOperation = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.operation) > 0);
        const cliKeyMissing = '<clikey-missing>';

        // collect operations in cli-operations
        const operations = [];
        const cliOps = [];
        group.operations.forEach((op) => {
            operations.push(op);
            cliOps.push(...NodeExtensionHelper.getCliOperation((op), () => []));
        });

        // put all cli operations at the end of array. So we can use targetIndex and parent.length to know whehter this operation is in cli.
        operations.push(...cliOps);

        for (let j = operations.length - 1; j >= 0; j--) {
            const op = operations[j];
            if (enumOperation) {
                action({
                    operationGroupCliKey: NodeCliHelper.getCliKey(group, cliKeyMissing),
                    operationCliKey: NodeCliHelper.getCliKey(op, cliKeyMissing),
                    parent: group.operations,
                    target: op,
                    targetIndex: j,
                });
            }
            Helper.enumrateParameters(group, op, action, flag);
        }
    }

    public static enumrateParameters(group: OperationGroup, op: Operation, action: (nodeDescriptor: CliCommonSchema.CodeModel.NodeDescriptor) => void, flag: CliCommonSchema.CodeModel.NodeTypeFlag): void {
        const enumParam = isNullOrUndefined(flag) || ((flag & CliCommonSchema.CodeModel.NodeTypeFlag.parameter) > 0);
        const cliKeyMissing = '<clikey-missing>';
       
        for (let k = op.parameters.length - 1; k >= 0; k--) {
            const param = op.parameters[k];
            if (enumParam) {
                action({
                    operationGroupCliKey: NodeCliHelper.getCliKey(group, cliKeyMissing),
                    operationCliKey: NodeCliHelper.getCliKey(op, cliKeyMissing),
                    requestIndex: CliConst.DEFAULT_OPERATION_PARAMETER_INDEX,
                    parameterCliKey: NodeCliHelper.getCliKey(param, cliKeyMissing),
                    parent: op.parameters,
                    target: param,
                    targetIndex: k,
                });
            }
        }
        
        for (let m = op.requests.length - 1; m >= 0; m--) {
            if (isNullOrUndefined(op.requests[m].parameters)) {
                continue;
            }
            for (let k = op.requests[m].parameters.length - 1; k >= 0; k--) {
                const param = op.requests[m].parameters[k];
                if (enumParam) {
                    action({
                        operationGroupCliKey: NodeCliHelper.getCliKey(group, cliKeyMissing),
                        operationCliKey: NodeCliHelper.getCliKey(op, cliKeyMissing),
                        requestIndex: m,
                        parameterCliKey: NodeCliHelper.getCliKey(param, cliKeyMissing),
                        parent: op.requests[m].parameters,
                        target: param,
                        targetIndex: k,
                    });
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isOperationGroup(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof OperationGroup) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === '$key') && props.find((prop) => prop === 'operations')) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isOperation(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof Operation) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === 'responses') || props.find((prop) => prop === 'parameters')) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isParameter(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof Parameter) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === 'implementation') || props.find((prop) => prop === 'flattened') || props.find((prop) => prop === 'groupedBy')) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isObjectSchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof ObjectSchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Object) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isDictionarySchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof DictionarySchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Dictionary) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isArraySchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof ArraySchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Array) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isAnySchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof AnySchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Any) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isChoiceSchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof ChoiceSchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Choice) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isSealedChoiceSchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof SealedChoiceSchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.SealedChoice) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isConstantSchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof ConstantSchema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        if (o.type === SchemaType.Constant) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isChoiceValue(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof ChoiceValue) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === 'language') && props.find((prop) => prop === 'value')) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isSchema(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof Schema) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === 'type')) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    public static isProperty(o: any): boolean {
        if (isNullOrUndefined(o)) {
            return false;
        }
        if (o instanceof Property) {
            return true;
        }
        if (o.prototype !== Object.prototype) {
            return false;
        }
        const props = Object.getOwnPropertyNames(o);
        if (props.find((prop) => prop === 'serializedName')) {
            return true;
        }
        return false;
    }

}