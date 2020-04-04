import { ArraySchema, DictionarySchema, Extensions, ObjectSchema, Operation, Parameter, Property, Schema } from "@azure-tools/codemodel";
import { isNullOrUndefined, isUndefined } from "util";
import { CliCommonSchema, M4Node } from "./schema";

export class NodeHelper {
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
    private static readonly CLI_OPERATIONS: string = "cli-operations";
    private static readonly JSON: string = "json";
    public static readonly FLATTEN_FLAG: string = 'x-ms-client-flatten';
    public static readonly DISCRIMINATOR_FLAG: string = 'discriminator';
    public static readonly CLI_DISCRIMINATOR_VALUE: string = 'discriminatorValue';
    public static readonly POLY_RESOURCE: string = 'poly-resource';
    private static readonly POLY_AS_RESOURCE_SUBCLASS_PARAM = "cli-poly-as-resource-subclass-param";
    private static readonly POLY_AS_RESOURCE_BASE_SCHEMA = 'cli-poly-as-resource-base-schema';
    private static readonly POLY_AS_RESOURCE_ORIGINAL_OPERATION = 'cli-poly-as-resource-original-operation';
    private static readonly POLY_AS_PARAM_BASE_SCHEMA = 'cli-poly-as-param-base-schema';
    private static readonly POLY_AS_PARAM_ORIGINIAL_PARAMETER = 'cli-poly-as-param-original-parameter';
    private static readonly POLY_AS_PARAM_EXPANDED = 'cli-poly-as-param-expanded';

    private static visitedKeyDict = {};

    /**
     * Check whether the obj has discriminator property
     * @param o
     */
    public static HasSubClass(node: ObjectSchema) {
        return !isNullOrUndefined(node.discriminator);
    }

    public static GetDiscriminatorValue(node: ObjectSchema) {
        return NodeHelper.getCliProperty(node, this.CLI_DISCRIMINATOR_VALUE, () => node.discriminatorValue);
    }

    public static setJson(node: M4Node, isJson: boolean, modifyFlatten: boolean) {

        if (modifyFlatten && isJson) {
            NodeHelper.setFlatten(node, false /*flatten*/, true /*overwrite flag*/);
        }
        NodeHelper.setCliProperty(node, NodeHelper.JSON, isJson);
    }

    public static getJson(node: M4Node) {
        return NodeHelper.getCliProperty(node, NodeHelper.JSON, () => false);
    }

    /**
     * set node.extensions['x-ms-client-flatten']
     * @param p
     * @param isFlatten
     * @param overwrite
     */
    public static setFlatten(node: Extensions, isFlatten: boolean, overwrite: boolean) {
        if (isNullOrUndefined(node.extensions))
            node.extensions = {};
        if (isNullOrUndefined(node.extensions[NodeHelper.FLATTEN_FLAG]) || overwrite) {
            node.extensions[NodeHelper.FLATTEN_FLAG] = isFlatten;
        }
    }

    /**
     *  check node.extensions['x-ms-client-flatten']
     * @param p
     */
    public static isFlattened(p: Extensions) {
        return !isNullOrUndefined(p.extensions) && p.extensions[NodeHelper.FLATTEN_FLAG] == true;
    }

    /**
     * return the value of node.extensions['x-ms-client-flatten']
     * possible value: true | false | undefined
     * @param p
     */
    public static getFlattenedValue(p: Extensions) {
        if (isNullOrUndefined(p.extensions) || isNullOrUndefined(p.extensions[NodeHelper.FLATTEN_FLAG]))
            return undefined;
        return p.extensions[NodeHelper.FLATTEN_FLAG];
    }

    /**
     * set node.language.cli.cliKey
     * @param node
     * @param value
     */
    public static setCliKey(node: M4Node, value: string) {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_KEY, value);
    }

    /**
     * get node.language.cli.cliKey
     * @param node
     */
    public static getCliKey(node: M4Node, defaultValue: string) {
        return isNullOrUndefined(node?.language[NodeHelper.CLI]) ? defaultValue : node.language[NodeHelper.CLI][NodeHelper.CLI_KEY];
    }

    public static setCliName(node: M4Node, value: string) {
        NodeHelper.setCliProperty(node, NodeHelper.NAME, value);
    }

    public static getCliName(node: M4Node, defaultValue: string) {
        return isNullOrUndefined(node?.language[NodeHelper.CLI]) ? defaultValue : node.language[NodeHelper.CLI][NodeHelper.NAME];
    }

    public static getDefaultNameWithType(node: ObjectSchema | DictionarySchema | ArraySchema) {
        return `${node.language.default.name}(${node instanceof ObjectSchema ? node.type : node instanceof DictionarySchema ? (node.elementType.language.default.name + '^dictionary') : (node.elementType.language.default.name + '^array')})`;
    }

    public static setHidden(node: M4Node, value: boolean) {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_HIDDEN, value);
    }

    public static getHidden(node: M4Node, defaultValue: boolean) {
        return NodeHelper.getCliProperty(node, NodeHelper.CLI_HIDDEN, () => false);
    }

    public static setRemoved(node: M4Node, value: boolean) {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_REMOVED, value);
    }

    public static getRemoved(node: M4Node, defaultValue: boolean) {
        return NodeHelper.getCliProperty(node, NodeHelper.CLI_REMOVED, () => false);
    }

    public static getCliDescription(node: M4Node) {
        return isNullOrUndefined(node.language[NodeHelper.CLI]) ? '' : node.language[NodeHelper.CLI][NodeHelper.DESCRIPTION];
    }

    public static setPolyAsResource(node: Parameter, value: boolean) {
        NodeHelper.setCliProperty(node, this.POLY_RESOURCE, value);
    }

    public static isPolyAsResource(node: Parameter): boolean {
        return NodeHelper.getCliProperty(node, this.POLY_RESOURCE, () => false);
    }

    public static setPolyAsResourceParam(op: Operation, polyParam: Parameter) {
        NodeHelper.setExtensionsProperty(op, NodeHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, polyParam);
    }

    public static getPolyAsResourceParam(op: Operation): Parameter {
        return NodeHelper.getExtensionsProperty(op, NodeHelper.POLY_AS_RESOURCE_SUBCLASS_PARAM, null);
    }

    public static setPolyAsResourceBaseSchema(param: Parameter, base: Schema) {
        NodeHelper.setExtensionsProperty(param, NodeHelper.POLY_AS_RESOURCE_BASE_SCHEMA, base);
    }

    public static getPolyAsResourceBaseSchema(param: Parameter): Schema {
        return NodeHelper.getExtensionsProperty(param, NodeHelper.POLY_AS_RESOURCE_BASE_SCHEMA, null);
    }

    public static setPolyAsResourceOriginalOperation(op: Operation, ori: Operation) {
        NodeHelper.setExtensionsProperty(op, NodeHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, ori);
    }

    public static getPolyAsResourceOriginalOperation(op: Operation): Schema {
        return NodeHelper.getExtensionsProperty(op, NodeHelper.POLY_AS_RESOURCE_ORIGINAL_OPERATION, null);
    }

    public static setPolyAsParamBaseSchema(param: Parameter, base: Schema) {
        NodeHelper.setExtensionsProperty(param, NodeHelper.POLY_AS_PARAM_BASE_SCHEMA, base);
    }

    public static getPolyAsParamBaseSchema(param: Parameter): Schema {
        return NodeHelper.getExtensionsProperty(param, NodeHelper.POLY_AS_PARAM_BASE_SCHEMA, null);
    }

    public static setPolyAsParamOriginalParam(param: Parameter, ori: Parameter) {
        NodeHelper.setExtensionsProperty(param, NodeHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, ori);
    }

    public static getPolyAsParamOriginalParam(param: Parameter): Schema {
        return NodeHelper.getExtensionsProperty(param, NodeHelper.POLY_AS_PARAM_ORIGINIAL_PARAMETER, null);
    }

    public static setPolyAsParamExpanded(param: Parameter, value: boolean) {
        NodeHelper.setCliProperty(param, NodeHelper.POLY_AS_PARAM_EXPANDED, value);
    }

    public static getPolyAsParamExpanded(param: Parameter): Schema {
        return NodeHelper.getCliProperty(param, NodeHelper.POLY_AS_PARAM_EXPANDED, () => false);
    }

    public static setComplex(node: M4Node, complexity: CliCommonSchema.CodeModel.Complexity): CliCommonSchema.CodeModel.Complexity {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_COMPLEXITY, complexity);
        return complexity;
    }

    public static clearComplex(node: M4Node) {
        NodeHelper.clearCliProperty(node, NodeHelper.CLI_COMPLEXITY);
    }

    public static getComplexity(node: M4Node): CliCommonSchema.CodeModel.Complexity {
        return NodeHelper.getCliProperty(node, NodeHelper.CLI_COMPLEXITY, () => undefined);
    }

    public static setIsVisibleFlag(node: M4Node, visiblity: CliCommonSchema.CodeModel.Visibility) {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_IS_VISIBLE, visiblity);
    }

    public static getIsVisibleFlag(node: M4Node): CliCommonSchema.CodeModel.Visibility {
        return NodeHelper.getCliProperty(node, NodeHelper.CLI_IS_VISIBLE, () => undefined);
    }

    public static checkVisibility(prop: Property): boolean {
        return (!prop.readOnly) && (!NodeHelper.getCliProperty(prop, 'removed', () => false)) && (!NodeHelper.getCliProperty(prop, 'hidden', () => false));
    }

    /**
     * set node.language.cli.key = value
     * @param node
     * @param key
     * @param value
     */
    public static setCliProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.language[NodeHelper.CLI]))
            node.language[NodeHelper.CLI] = {};
        node.language[NodeHelper.CLI][key] = value;
    }

    public static clearCliProperty(node: M4Node, key: string): void {
        if (!isNullOrUndefined(node.language[NodeHelper.CLI]) && !isUndefined(node.language[NodeHelper.CLI][key]))
            delete node.language[NodeHelper.CLI][key];
    }

    public static getCliProperty(node: M4Node, propertyName: string, defaultWhenNotExist: () => any): any {
        if (isNullOrUndefined(node.language[NodeHelper.CLI])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        if (isNullOrUndefined(node.language[NodeHelper.CLI][propertyName])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        return node.language[NodeHelper.CLI][propertyName];
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
                defaultWhenNotExist();
        }
        if (isNullOrUndefined(node.extensions[propertyName])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        return node.extensions[propertyName];
    }

    public static setSimplifyIndicator(schema: ObjectSchema, indicator: CliCommonSchema.CodeModel.SimplifyIndicator): CliCommonSchema.CodeModel.SimplifyIndicator {
        this.setCliProperty(schema, this.CLI_SIMPLIFIER_INDICATOR, indicator);
        return indicator;
    }

    public static getSimplifyIndicator(schema: ObjectSchema): CliCommonSchema.CodeModel.SimplifyIndicator {
        return this.getCliProperty(schema, this.CLI_SIMPLIFIER_INDICATOR, () => undefined);
    }

    public static clearSimplifyIndicator(schema: ObjectSchema) {
        return this.clearCliProperty(schema, this.CLI_SIMPLIFIER_INDICATOR);
    }

    public static setInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema, inCircle: boolean): boolean {
        this.setCliProperty(schema, this.CLI_IN_CIRCLE, inCircle);
        return inCircle;
    }

    public static getInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema): boolean {
        return this.getCliProperty(schema, this.CLI_IN_CIRCLE, () => undefined);
    }

    public static clearInCircle(schema: ObjectSchema | ArraySchema | DictionarySchema) {
        return this.clearCliProperty(schema, this.CLI_IN_CIRCLE);
    }


    public static setMark(node: M4Node, mark: string): string {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_MARK, mark);
        return mark;
    }

    public static getMark(node: M4Node): string {
        return NodeHelper.getCliProperty(node, NodeHelper.CLI_MARK, () => undefined);
    }

    public static clearMark(node: M4Node) {
        NodeHelper.clearCliProperty(node, NodeHelper.CLI_MARK);
    }

    public static addCliOperation(originalOperation: Operation, cliOperation: Operation) {
        let v: Operation[] = NodeHelper.getExtensionsProperty(originalOperation, this.CLI_OPERATIONS, () => []);
        v.push(cliOperation);
        NodeHelper.setExtensionsProperty(originalOperation, this.CLI_OPERATIONS, v);
    }

    public static getCliOperation(originalOperation: Operation, defaultValue: () => any): Operation[] {
        return NodeHelper.getExtensionsProperty(originalOperation, this.CLI_OPERATIONS, defaultValue);
    }
}