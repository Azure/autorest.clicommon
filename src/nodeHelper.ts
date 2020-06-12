import { ArraySchema, DictionarySchema, Extensions, ObjectSchema, Operation, Parameter, Property, Schema } from "@azure-tools/codemodel";
import { isNullOrUndefined, isUndefined } from "util";
import { CliCommonSchema, M4Node } from "./schema";
import { Helper } from "./helper";

export class NodeCliHelper {
    public static readonly CLI_DISCRIMINATOR_VALUE: string = 'cli-discriminator-value';

    // TODO: Consider add specific class for directive keys
    public static readonly POLY_RESOURCE: string = 'poly-resource';
    public static readonly CLI_FLATTEN: string = 'cli-flatten';
    public static readonly SPLIT_OPERATION_NAMES = 'split-operation-names';

    private static readonly CLI: string = "cli";
    private static readonly NAME: string = "name";
    private static readonly DESCRIPTION: string = "description";
    private static readonly CLI_KEY: string = "cliKey";
    private static readonly CLI_HIDDEN: string = "hidden";
    private static readonly CLI_REMOVED: string = "removed";
    private static readonly CLI_COMPLEXITY: string = "cli-complexity";
    private static readonly CLI_SIMPLIFIER_INDICATOR: string = "cli-simplify-indicator";
    private static readonly CLI_IN_CIRCLE: string = "cli-in-circle";
    private static readonly CLI_MARK: string = "cli-mark";
    private static readonly CLI_IS_VISIBLE: string = "cli-is-visible";
    private static readonly CLI_OPERATION_SPLITTED = 'cli-operation-splitted';
    private static readonly JSON: string = "json";

    private static readonly POLY_AS_PARAM_EXPANDED = 'cli-poly-as-param-expanded';

    private static readonly FLATTENED_NAMES = 'flattenedNames';

    public static setCliDiscriminatorValue(node: ObjectSchema, value: string) {
        return NodeCliHelper.setCliProperty(node, this.CLI_DISCRIMINATOR_VALUE, value);
    }

    public static getCliDiscriminatorValue(node: ObjectSchema) {
        return NodeCliHelper.getCliProperty(node, this.CLI_DISCRIMINATOR_VALUE, () => node.discriminatorValue);
    }

    /**
     * set node.language.cli.cliKey
     * @param node
     * @param value
     */
    public static setCliKey(node: M4Node, value: string) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_KEY, value);
    }

    /**
     * get node.language.cli.cliKey
     * @param node
     */
    public static getCliKey(node: M4Node, defaultValue: string) {
        return isNullOrUndefined(node?.language[NodeCliHelper.CLI]) ? defaultValue : node.language[NodeCliHelper.CLI][NodeCliHelper.CLI_KEY];
    }

    public static setCliName(node: M4Node, value: string) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.NAME, value);
    }

    public static getCliName(node: M4Node, defaultValue: string) {
        return isNullOrUndefined(node?.language[NodeCliHelper.CLI]) ? defaultValue : node.language[NodeCliHelper.CLI][NodeCliHelper.NAME];
    }

    public static getDefaultNameWithType(node: ObjectSchema | DictionarySchema | ArraySchema) {
        return `${node.language.default.name}(${node instanceof ObjectSchema ? node.type : node instanceof DictionarySchema ? (node.elementType.language.default.name + '^dictionary') : (node.elementType.language.default.name + '^array')})`;
    }

    public static setHidden(node: M4Node, value: boolean) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_HIDDEN, value);
    }

    public static getHidden(node: M4Node, defaultValue: boolean) {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_HIDDEN, () => defaultValue);
    }

    public static setRemoved(node: M4Node, value: boolean) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_REMOVED, value);
    }

    public static getRemoved(node: M4Node, defaultValue: boolean) {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_REMOVED, () => false);
    }

    public static getCliDescription(node: M4Node) {
        return isNullOrUndefined(node.language[NodeCliHelper.CLI]) ? '' : node.language[NodeCliHelper.CLI][NodeCliHelper.DESCRIPTION];
    }

    public static setCliOperationSplitted(op: Operation, value: boolean) {
        NodeCliHelper.setCliProperty(op, NodeCliHelper.CLI_OPERATION_SPLITTED, value);
    }

    public static getCliOperationSplitted(op: Operation): boolean {
        return NodeCliHelper.getCliProperty(op, NodeCliHelper.CLI_OPERATION_SPLITTED, () => null);
    }

    public static getCliSplitOperationNames(node: Operation): string[] {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.SPLIT_OPERATION_NAMES, () => null);
    }

    public static clearCliSplitOperationNames(node: Operation) {
        NodeCliHelper.clearCliProperty(node, NodeCliHelper.SPLIT_OPERATION_NAMES);
    }

    public static isCliFlatten(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_FLATTEN, () => false);
    }

    public static getCliFlattenedNames(param: Parameter): string[] {
        return NodeCliHelper.getCliProperty(param, NodeCliHelper.FLATTENED_NAMES, () => []);
    }

    public static setCliFlattenedNames(param: Parameter, flattenedNames: string[]) {
        NodeCliHelper.setCliProperty(param, NodeCliHelper.FLATTENED_NAMES, flattenedNames);
    }

    public static setPolyAsResource(node: Parameter, value: boolean) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.POLY_RESOURCE, value);
    }

    public static isPolyAsResource(node: Parameter): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.POLY_RESOURCE, () => false);
    }

    public static setPolyAsParamExpanded(param: Parameter, value: boolean) {
        NodeCliHelper.setCliProperty(param, NodeCliHelper.POLY_AS_PARAM_EXPANDED, value);
    }

    public static getPolyAsParamExpanded(param: Parameter): Schema {
        return NodeCliHelper.getCliProperty(param, NodeCliHelper.POLY_AS_PARAM_EXPANDED, () => false);
    }

    public static setComplex(node: M4Node, complexity: CliCommonSchema.CodeModel.Complexity): CliCommonSchema.CodeModel.Complexity {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_COMPLEXITY, complexity);
        return complexity;
    }

    public static clearComplex(node: M4Node) {
        NodeCliHelper.clearCliProperty(node, NodeCliHelper.CLI_COMPLEXITY);
    }

    public static getComplexity(node: M4Node): CliCommonSchema.CodeModel.Complexity {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_COMPLEXITY, () => undefined);
    }

    public static setIsVisibleFlag(node: M4Node, visiblity: CliCommonSchema.CodeModel.Visibility) {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_IS_VISIBLE, visiblity);
    }

    public static getIsVisibleFlag(node: M4Node): CliCommonSchema.CodeModel.Visibility {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_IS_VISIBLE, () => undefined);
    }

    /**
     * set node.language.cli.key = value
     * @param node
     * @param key
     * @param value
     */
    public static setCliProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.language[NodeCliHelper.CLI]))
            node.language[NodeCliHelper.CLI] = {};
        node.language[NodeCliHelper.CLI][key] = value;
    }

    public static clearCliProperty(node: M4Node, key: string): void {
        if (!isNullOrUndefined(node.language[NodeCliHelper.CLI]) && !isUndefined(node.language[NodeCliHelper.CLI][key]))
            delete node.language[NodeCliHelper.CLI][key];
    }

    public static getCliProperty(node: M4Node, propertyName: string, defaultWhenNotExist: () => any): any {
        if (isNullOrUndefined(node.language[NodeCliHelper.CLI])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        if (isNullOrUndefined(node.language[NodeCliHelper.CLI][propertyName])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        return node.language[NodeCliHelper.CLI][propertyName];
    }

    public static setSimplifyIndicator(schema: ObjectSchema, indicator: CliCommonSchema.CodeModel.SimplifyIndicator): CliCommonSchema.CodeModel.SimplifyIndicator {
        NodeCliHelper.setCliProperty(schema, NodeCliHelper.CLI_SIMPLIFIER_INDICATOR, indicator);
        return indicator;
    }

    public static getSimplifyIndicator(schema: ObjectSchema): CliCommonSchema.CodeModel.SimplifyIndicator {
        return NodeCliHelper.getCliProperty(schema, NodeCliHelper.CLI_SIMPLIFIER_INDICATOR, () => undefined);
    }

    public static clearSimplifyIndicator(schema: ObjectSchema) {
        return NodeCliHelper.clearCliProperty(schema, NodeCliHelper.CLI_SIMPLIFIER_INDICATOR);
    }

    public static setInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema, inCircle: boolean): boolean {
        NodeCliHelper.setCliProperty(schema, this.CLI_IN_CIRCLE, inCircle);
        return inCircle;
    }

    public static getInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema): boolean {
        return NodeCliHelper.getCliProperty(schema, NodeCliHelper.CLI_IN_CIRCLE, () => undefined);
    }

    public static clearInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema) {
        return NodeCliHelper.clearCliProperty(schema, NodeCliHelper.CLI_IN_CIRCLE);
    }


    public static setMark(node: M4Node, mark: string): string {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_MARK, mark);
        return mark;
    }

    public static getMark(node: M4Node): string {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_MARK, () => undefined);
    }

    public static clearMark(node: M4Node) {
        NodeCliHelper.clearCliProperty(node, NodeCliHelper.CLI_MARK);
    }
}

export class NodeExtensionHelper {

    public static readonly FLATTEN_FLAG: string = 'x-ms-client-flatten';

    private static readonly POLY_AS_RESOURCE_SUBCLASS_PARAM = "cli-poly-as-resource-subclass-param";
    private static readonly POLY_AS_RESOURCE_BASE_SCHEMA = 'cli-poly-as-resource-base-schema';
    private static readonly POLY_AS_RESOURCE_ORIGINAL_OPERATION = 'cli-poly-as-resource-original-operation';
    private static readonly POLY_AS_RESOURCE_DISCRIMINATOR_VALUE = 'cli-poly-as-resource-discriminator-value';
    private static readonly POLY_AS_PARAM_BASE_SCHEMA = 'cli-poly-as-param-base-schema';
    private static readonly POLY_AS_PARAM_ORIGINIAL_PARAMETER = 'cli-poly-as-param-original-parameter';
    private static readonly CLI_OPERATIONS: string = "cli-operations";

    private static readonly SPLIT_OPERATION_ORIGINAL_OPERATION = 'cli-split-operation-original-operation';

    private static readonly CLI_FLATTENED = 'cli-flattened';
    private static readonly CLI_FLATTEN_ORIGIN = 'cli-flatten-origin';
    private static readonly CLI_FLATTEN_PREFIX = 'cli-flatten-prefix';

    /**
     * set node.extensions['x-ms-client-flatten']
     * @param p
     * @param isFlatten
     * @param overwrite
     */
    public static setFlatten(node: Extensions, isFlatten: boolean, overwrite: boolean) {
        if (isNullOrUndefined(node.extensions))
            node.extensions = {};
        if (isNullOrUndefined(node.extensions[NodeExtensionHelper.FLATTEN_FLAG]) || overwrite) {
            node.extensions[NodeExtensionHelper.FLATTEN_FLAG] = isFlatten;
        }
    }

    /**
     *  check node.extensions['x-ms-client-flatten']
     * @param p
     */
    public static isFlattened(p: Extensions) {
        return !isNullOrUndefined(p.extensions) && p.extensions[NodeExtensionHelper.FLATTEN_FLAG] == true;
    }

    /**
     * return the value of node.extensions['x-ms-client-flatten']
     * possible value: true | false | undefined
     * @param p
     */
    public static getFlattenedValue(p: Extensions) {
        if (isNullOrUndefined(p.extensions) || isNullOrUndefined(p.extensions[NodeExtensionHelper.FLATTEN_FLAG]))
            return undefined;
        return p.extensions[NodeExtensionHelper.FLATTEN_FLAG];
    }

    public static setCliFlattenOrigin(node: M4Node, ori: M4Node) {
        NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_ORIGIN, ori);
    }

    public static getCliFlattenOrigin(node: M4Node): Property {
        return NodeExtensionHelper.getExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_ORIGIN, () => null);
    }

    public static setCliFlattenPrefix(node: M4Node, value: string) {
        NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_PREFIX, value);
    }

    public static getCliFlattenPrefix(param: Parameter): string {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.CLI_FLATTEN_PREFIX, () => null);
    }

    public static setPolyAsResourceParam(op: Operation, polyParam: Parameter) {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, polyParam);
    }

    public static getPolyAsResourceParam(op: Operation): Parameter {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, null);
    }

    public static setPolyAsResourceBaseSchema(param: Parameter, base: Schema) {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_RESOURCE_BASE_SCHEMA, base);
    }

    public static getPolyAsResourceBaseSchema(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_RESOURCE_BASE_SCHEMA, null);
    }

    public static setPolyAsResourceOriginalOperation(op: Operation, ori: Operation) {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, ori);
    }

    public static getPolyAsResourceOriginalOperation(op: Operation): Schema {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, null);
    }

    public static setPolyAsResourceDiscriminatorValue(op: Operation, value: string) {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_DISCRIMINATOR_VALUE, value);
    }

    public static getPolyAsResourceDiscriminatorValue(op: Operation): string {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_DISCRIMINATOR_VALUE, null);
    }

    public static setSplitOperationOriginalOperation(op: Operation, ori: Operation) {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.SPLIT_OPERATION_ORIGINAL_OPERATION, ori);
    }

    public static getSplitOperationOriginalOperation(op: Operation): Schema {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.SPLIT_OPERATION_ORIGINAL_OPERATION, null);
    }

    public static setPolyAsParamBaseSchema(param: Parameter, base: Schema) {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_BASE_SCHEMA, base);
    }

    public static getPolyAsParamBaseSchema(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_BASE_SCHEMA, null);
    }

    public static setPolyAsParamOriginalParam(param: Parameter, ori: Parameter) {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, ori);
    }

    public static getPolyAsParamOriginalParam(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, null);
    }

    public static setCliFlattened(node: M4Node, value: boolean) {
        NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTENED, value);
    }

    public static isCliFlattened(node: M4Node): boolean {
        return NodeExtensionHelper.getExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTENED, () => false);
    }

    public static addCliOperation(originalOperation: Operation, cliOperation: Operation) {
        let v: Operation[] = NodeExtensionHelper.getExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, () => []);
        v.push(cliOperation);
        NodeExtensionHelper.setExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, v);
    }

    public static getCliOperation(originalOperation: Operation, defaultValue: () => any): Operation[] {
        return NodeExtensionHelper.getExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, defaultValue);
    }

    public static setExtensionsProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.extensions))
            node.extensions = {};
        node.extensions[key] = value;
    }

    public static getExtensionsProperty(node: M4Node, propertyName: string, defaultWhenNotExist: () => any): any {
        if (isNullOrUndefined(node.extensions)) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        if (isNullOrUndefined(node.extensions[propertyName])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        return node.extensions[propertyName];
    }
}

export class NodeHelper {

    public static readonly DISCRIMINATOR_FLAG: string = 'discriminator';
    private static readonly JSON: string = "json";

    /**
     * Check whether the obj has discriminator property
     * @param o
     */
    public static HasSubClass(node: ObjectSchema) {
        return !isNullOrUndefined(node.discriminator);
    }

    public static *getSubClasses(baseSchema: ObjectSchema, leafOnly: boolean) {

        let allSubs = baseSchema.discriminator?.all;
        if (isNullOrUndefined(allSubs))
            return [];

        for (let key in allSubs) {
            let subClass = allSubs[key];
            if (!(subClass instanceof ObjectSchema)) {
                Helper.logWarning("subclass is not ObjectSchema: " + subClass.language.default.name);
                continue;
            }
            if (NodeHelper.HasSubClass(subClass) && leafOnly) {
                Helper.logWarning("skip subclass which also has subclass: " + subClass.language.default.name);
                continue;
            }
            yield subClass;
        }
    }

    public static setJson(node: M4Node, isJson: boolean, modifyFlatten: boolean) {

        if (modifyFlatten && isJson) {
            NodeExtensionHelper.setFlatten(node, false /*flatten*/, true /*overwrite flag*/);
        }
        NodeCliHelper.setCliProperty(node, NodeHelper.JSON, isJson);
    }

    public static getJson(node: M4Node) {
        return NodeCliHelper.getCliProperty(node, NodeHelper.JSON, () => false);
    }

    public static getDefaultNameWithType(node: ObjectSchema | DictionarySchema | ArraySchema) {
        return `${node.language.default.name}(${node instanceof ObjectSchema ? node.type : node instanceof DictionarySchema ? (node.elementType.language.default.name + '^dictionary') : (node.elementType.language.default.name + '^array')})`;
    }

    public static checkVisibility(prop: Property): boolean {
        return (!prop.readOnly) && (!NodeCliHelper.getCliProperty(prop, 'removed', () => false)) && (!NodeCliHelper.getCliProperty(prop, 'hidden', () => false));
    }
}