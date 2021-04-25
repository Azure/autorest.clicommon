import { ArraySchema, DictionarySchema, Extensions, ObjectSchema, Operation, Parameter, Property, Schema, Request } from "@azure-tools/codemodel";
import { isNullOrUndefined, isUndefined } from "util";
import { CliCommonSchema, M4Node } from "./schema";
import { Helper } from "./helper";

export class NodeCliHelper {
    public static readonly CLI_DISCRIMINATOR_VALUE: string = 'cli-discriminator-value';

    // TODO: Consider add specific class for directive keys
    public static readonly POLY_RESOURCE: string = 'poly-resource';
    public static readonly POLY_RESOURCED: string = 'poly-resourced';
    public static readonly CLI_FLATTEN: string = 'cli-flatten';
    public static readonly CLI_FLATTENED: string = 'cli-flattened';
    public static readonly CLI_M4_FLATTEN: string = 'cli-m4-flatten';
    public static readonly CLI_M4_FLATTENED: string = 'cli-m4-flattened';
    public static readonly CLI_PAYLOAD_FLATTENED: string = 'cli-payload-flattened';
    public static readonly SPLIT_OPERATION_NAMES = 'split-operation-names';
    public static readonly CLI_M4_PATH: string = 'cliM4Path';
    public static readonly CLI_PATH: string = 'cliPath';
    public static readonly CLI_FLATTEN_TRACE: string = 'cliFlattenTrace';
    public static readonly CLI_MIN_API: string = 'min-api';
    public static readonly CLI_MAX_API: string = 'max-api';
    public static readonly CLI_RESOURCE_TYPE: string = 'resource-type';

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
    private static readonly CLI_DEFAULT_VALUE: string = "default-value";


    private static readonly POLY_AS_PARAM_EXPANDED = 'cli-poly-as-param-expanded';

    public static setCliDiscriminatorValue(node: ObjectSchema, value: string): void {
        NodeCliHelper.setCliProperty(node, this.CLI_DISCRIMINATOR_VALUE, value);
    }

    public static getCliDiscriminatorValue(node: ObjectSchema): string {
        return NodeCliHelper.getCliProperty(node, this.CLI_DISCRIMINATOR_VALUE, () => node.discriminatorValue);
    }

    /**
     * set node.language.cli.cliKey
     * @param node
     * @param value
     */
    public static setCliKey(node: M4Node, value: string): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_KEY, value);
    }

    /**
     * get node.language.cli.cliKey
     * @param node
     */
    public static getCliKey(node: M4Node, defaultValue: string): string {
        return isNullOrUndefined(node?.language[NodeCliHelper.CLI]) ? defaultValue : node.language[NodeCliHelper.CLI][NodeCliHelper.CLI_KEY];
    }

    public static getCliFlattenTrace(node: M4Node): string[] {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_FLATTEN_TRACE, () => undefined);
    }

    public static setCliFlattenTrace(node: M4Node, value: string[]): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_FLATTEN_TRACE, value);
    }

    public static setCliM4Path(node: M4Node, path: string): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_M4_PATH, path);
    }

    public static getCliM4Path(node: M4Node): string {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_M4_PATH, () => undefined);
    }

    public static setCliPath(node: M4Node, path: string): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_PATH, path);
    }

    public static getCliPath(node: M4Node): string {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_PATH, () => undefined);
    }

    public static setCliName(node: M4Node, value: string): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.NAME, value);
    }

    public static getCliName(node: M4Node, defaultValue: string): string {
        return isNullOrUndefined(node?.language[NodeCliHelper.CLI]) ? defaultValue : node.language[NodeCliHelper.CLI][NodeCliHelper.NAME];
    }

    public static setHidden(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_HIDDEN, value);
    }

    public static getHidden(node: M4Node, defaultValue: boolean): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_HIDDEN, () => defaultValue);
    }

    public static setRemoved(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_REMOVED, value);
    }

    public static getRemoved(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_REMOVED, () => false);
    }

    public static getCliDescription(node: M4Node): string {
        return isNullOrUndefined(node.language[NodeCliHelper.CLI]) ? '' : node.language[NodeCliHelper.CLI][NodeCliHelper.DESCRIPTION];
    }

    public static setCliOperationSplitted(op: Operation, value: boolean): void {
        NodeCliHelper.setCliProperty(op, NodeCliHelper.CLI_OPERATION_SPLITTED, value);
    }

    public static getCliOperationSplitted(op: Operation): boolean {
        return NodeCliHelper.getCliProperty(op, NodeCliHelper.CLI_OPERATION_SPLITTED, () => null);
    }

    public static getCliSplitOperationNames(node: Operation): string[] {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.SPLIT_OPERATION_NAMES, () => null);
    }

    public static clearCliSplitOperationNames(node: Operation): void {
        NodeCliHelper.clearCliProperty(node, NodeCliHelper.SPLIT_OPERATION_NAMES);
    }

    public static setCliFlatten(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_FLATTEN, value);
    }

    public static isCliFlatten(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_FLATTEN, () => false);
    }

    public static setCliFlattened(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_FLATTENED, value);
    }

    public static isCliFlattened(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_FLATTENED, () => false);
    }

    public static setCliM4Flatten(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_M4_FLATTEN, value);
    }

    public static isCliM4Flatten(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_M4_FLATTEN, () => false);
    }

    public static setCliM4Flattened(node: M4Node, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_M4_FLATTENED, value);
    }

    public static isCliM4Flattened(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_M4_FLATTENED, () => false);
    }

    public static setCliPayloadFlattened(request: Request, value: boolean): void {
        NodeCliHelper.setCliProperty(request, NodeCliHelper.CLI_PAYLOAD_FLATTENED, value);
    }

    public static isCliPayloadFlattened(request: Request): boolean {
        return NodeCliHelper.getCliProperty(request, NodeCliHelper.CLI_PAYLOAD_FLATTENED, () => false);
    }

    public static setPolyAsResource(node: Parameter, value: boolean): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.POLY_RESOURCE, value);
    }

    public static isPolyAsResource(node: Parameter): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.POLY_RESOURCE, () => false);
    }

    public static isPolyAsResourced(node: Parameter): boolean {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.POLY_RESOURCED, () => false);
    }

    public static setPolyAsResourced(node: Parameter, value: boolean): void {
        return NodeCliHelper.setCliProperty(node, NodeCliHelper.POLY_RESOURCED, value);
    }

    public static setPolyAsParamExpanded(param: Parameter, value: boolean): void {
        NodeCliHelper.setCliProperty(param, NodeCliHelper.POLY_AS_PARAM_EXPANDED, value);
    }

    public static getPolyAsParamExpanded(param: Parameter): Schema {
        return NodeCliHelper.getCliProperty(param, NodeCliHelper.POLY_AS_PARAM_EXPANDED, () => false);
    }

    public static setComplex(node: M4Node, complexity: CliCommonSchema.CodeModel.Complexity): CliCommonSchema.CodeModel.Complexity {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_COMPLEXITY, complexity);
        return complexity;
    }

    public static clearComplex(node: M4Node): void {
        NodeCliHelper.clearCliProperty(node, NodeCliHelper.CLI_COMPLEXITY);
    }

    public static getComplexity(node: M4Node): CliCommonSchema.CodeModel.Complexity {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_COMPLEXITY, () => undefined);
    }

    public static setIsVisibleFlag(node: M4Node, visiblity: CliCommonSchema.CodeModel.Visibility): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_IS_VISIBLE, visiblity);
    }

    public static getIsVisibleFlag(node: M4Node): CliCommonSchema.CodeModel.Visibility {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_IS_VISIBLE, () => undefined);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    public static setCliDefaultValue(node: M4Node, value: any): void {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_DEFAULT_VALUE, value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static getCliDefaultValue(node: M4Node): any {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_DEFAULT_VALUE, () => undefined);
    }

    /**
     * set node.language.cli.key = value
     * @param node
     * @param key
     * @param value
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    public static setCliProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node?.language)) {
            return undefined;
        }
        if (isNullOrUndefined(node.language[NodeCliHelper.CLI]))
            node.language[NodeCliHelper.CLI] = {};
        node.language[NodeCliHelper.CLI][key] = value;
    }

    public static clearCliProperty(node: M4Node, key: string): void {
        if (!isNullOrUndefined(node.language[NodeCliHelper.CLI]) && !isUndefined(node.language[NodeCliHelper.CLI][key]))
            delete node.language[NodeCliHelper.CLI][key];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    public static clearSimplifyIndicator(schema: ObjectSchema): void {
        NodeCliHelper.clearCliProperty(schema, NodeCliHelper.CLI_SIMPLIFIER_INDICATOR);
    }

    public static setInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema, inCircle: boolean): boolean {
        NodeCliHelper.setCliProperty(schema, this.CLI_IN_CIRCLE, inCircle);
        return inCircle;
    }

    public static getInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema): boolean {
        return NodeCliHelper.getCliProperty(schema, NodeCliHelper.CLI_IN_CIRCLE, () => undefined);
    }

    public static clearInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema): void {
        NodeCliHelper.clearCliProperty(schema, NodeCliHelper.CLI_IN_CIRCLE);
    }


    public static setMark(node: M4Node, mark: string): string {
        NodeCliHelper.setCliProperty(node, NodeCliHelper.CLI_MARK, mark);
        return mark;
    }

    public static getMark(node: M4Node): string {
        return NodeCliHelper.getCliProperty(node, NodeCliHelper.CLI_MARK, () => undefined);
    }

    public static clearMark(node: M4Node): void {
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

    private static readonly CLI_FLATTEN_ORIGIN = 'cli-flatten-origin';
    private static readonly CLI_FLATTEN_PREFIX = 'cli-flatten-prefix';
    private static readonly CLI_DISCRIMINATOR_VALUE = 'cli-discriminator-value';

    /**
     * return the value of node.extensions['x-ms-client-flatten']
     * possible value: true | false | undefined
     * @param p
     */
    public static getFlattenedValue(p: Extensions): boolean | undefined {
        if (isNullOrUndefined(p.extensions) || isNullOrUndefined(p.extensions[NodeExtensionHelper.FLATTEN_FLAG]))
            return undefined;
        return p.extensions[NodeExtensionHelper.FLATTEN_FLAG];
    }

    public static setCliFlattenOrigin(node: M4Node, ori: M4Node): void {
        NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_ORIGIN, ori);
    }

    public static getCliFlattenOrigin(node: M4Node): Property {
        return NodeExtensionHelper.getExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_ORIGIN, () => null);
    }

    public static setCliFlattenPrefix(node: M4Node, value: string): void {
        NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_FLATTEN_PREFIX, value);
    }

    public static getCliFlattenPrefix(param: Parameter): string {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.CLI_FLATTEN_PREFIX, () => null);
    }

    public static setCliDiscriminatorValue(node: M4Node, value: string): void{
        return NodeExtensionHelper.setExtensionsProperty(node, NodeExtensionHelper.CLI_DISCRIMINATOR_VALUE, value);
    }

    public static getCliDiscriminatorValue(param: Parameter): string {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.CLI_DISCRIMINATOR_VALUE, () => null);
    }

    public static setPolyAsResourceParam(op: Operation, polyParam: Parameter): void {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, polyParam);
    }

    public static getPolyAsResourceParam(op: Operation): Parameter {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, null);
    }

    public static setPolyAsResourceBaseSchema(param: Parameter, base: Schema): void {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_RESOURCE_BASE_SCHEMA, base);
    }

    public static getPolyAsResourceBaseSchema(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_RESOURCE_BASE_SCHEMA, null);
    }

    public static setPolyAsResourceOriginalOperation(op: Operation, ori: Operation): void {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, ori);
    }

    public static getPolyAsResourceOriginalOperation(op: Operation): Operation {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, null);
    }

    public static setPolyAsResourceDiscriminatorValue(op: Operation, value: string): void {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_DISCRIMINATOR_VALUE, value);
    }

    public static getPolyAsResourceDiscriminatorValue(op: Operation): string {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.POLY_AS_RESOURCE_DISCRIMINATOR_VALUE, null);
    }

    public static setSplitOperationOriginalOperation(op: Operation, ori: Operation): void {
        NodeExtensionHelper.setExtensionsProperty(op, NodeExtensionHelper.SPLIT_OPERATION_ORIGINAL_OPERATION, ori);
    }

    public static getSplitOperationOriginalOperation(op: Operation): Operation {
        return NodeExtensionHelper.getExtensionsProperty(op, NodeExtensionHelper.SPLIT_OPERATION_ORIGINAL_OPERATION, null);
    }

    public static setPolyAsParamBaseSchema(param: Parameter, base: Schema): void {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_BASE_SCHEMA, base);
    }

    public static getPolyAsParamBaseSchema(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_BASE_SCHEMA, null);
    }

    public static setPolyAsParamOriginalParam(param: Parameter, ori: Parameter): void {
        NodeExtensionHelper.setExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, ori);
    }

    public static getPolyAsParamOriginalParam(param: Parameter): Schema {
        return NodeExtensionHelper.getExtensionsProperty(param, NodeExtensionHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, null);
    }

    public static addCliOperation(originalOperation: Operation, cliOperation: Operation): void {
        const v: Operation[] = NodeExtensionHelper.getExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, () => []);
        v.push(cliOperation);
        NodeExtensionHelper.setExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, v);
    }

    public static getCliOperation(originalOperation: Operation, defaultValue: () => Operation[]): Operation[] {
        return NodeExtensionHelper.getExtensionsProperty(originalOperation, NodeExtensionHelper.CLI_OPERATIONS, defaultValue);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    public static setExtensionsProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.extensions))
            node.extensions = {};
        node.extensions[key] = value;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
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

    public static setFlatten(node: Extensions, isFlatten: boolean, overwrite: boolean): void {
        if (isNullOrUndefined(node.extensions)) {
            node.extensions = {};
        }
        if (isNullOrUndefined(node.extensions[NodeExtensionHelper.FLATTEN_FLAG]) || overwrite) {
            node.extensions[NodeExtensionHelper.FLATTEN_FLAG] = isFlatten;
        }
    }
}

export class NodeHelper {

    public static readonly DISCRIMINATOR_FLAG: string = 'discriminator';
    private static readonly JSON: string = "json";

    /**
     * Check whether the obj has discriminator property
     * @param o
     */
    public static HasSubClass(node: ObjectSchema): boolean {
        return !isNullOrUndefined(node.discriminator);
    }

    public static *getSubClasses(baseSchema: ObjectSchema, leafOnly: boolean): Generator<ObjectSchema, ObjectSchema[], unknown> {

        const allSubs = baseSchema.discriminator?.all;
        if (isNullOrUndefined(allSubs))
            return [];

        for (const key in allSubs) {
            const subClass = allSubs[key];
            if (!Helper.isObjectSchema(subClass)) {
                continue;
            }
            if (NodeHelper.HasSubClass(subClass as ObjectSchema) && leafOnly) {
                continue;
            }
            yield subClass as ObjectSchema;
        }
    }

    public static setJson(node: M4Node, isJson: boolean, modifyFlatten: boolean): void {

        if (modifyFlatten && isJson) {
            NodeCliHelper.setCliFlatten(node, false);
            NodeExtensionHelper.setFlatten(node, false /*flatten*/, true /*overwrite flag*/);
        }
        NodeCliHelper.setCliProperty(node, NodeHelper.JSON, isJson);
    }

    public static getJson(node: M4Node): boolean {
        return NodeCliHelper.getCliProperty(node, NodeHelper.JSON, () => false);
    }

    public static getDefaultNameWithType(node: ObjectSchema | DictionarySchema | ArraySchema): string {
        return `${node.language.default.name}(${Helper.isObjectSchema(node) ? node.type : 
            Helper.isDictionarySchema(node) ? ((<DictionarySchema>node).elementType.language.default.name + '^dictionary') : 
            ((<ArraySchema>node).elementType.language.default.name + '^array')})`;
    }

    public static checkVisibility(prop: Property): boolean {
        return (!prop.readOnly) && (!NodeCliHelper.getCliProperty(prop, 'removed', () => false)) && (!NodeCliHelper.getCliProperty(prop, 'hidden', () => false));
    }
}