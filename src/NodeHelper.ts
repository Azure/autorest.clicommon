import { codeModelSchema, ChoiceSchema, ChoiceValue, Extensions, CodeModel, ObjectSchema, Operation, OperationGroup, Parameter, Property, SealedChoiceSchema, Schema, ConstantSchema, SchemaType } from "@azure-tools/codemodel";
import { isArray, isNull, isNullOrUndefined, isObject, isString, isUndefined } from "util";
import { CliConst, M4Node, M4NodeType, NamingType, CliCommonSchema } from "./schema";

export class NodeHelper {
    private static readonly CLI: string = "cli";
    private static readonly CLI_KEY: string = "cliKey";
    private static readonly JSON: string = "json";
    public static readonly FLATTEN_FLAG: string = 'x-ms-client-flatten';

    /**
     * Check whether the obj has discriminator property
     * @param o
     */
    public static isBaseClass(node: ObjectSchema) {
        return !isNullOrUndefined(node.discriminator);
    }

    public static setJson(node: M4Node, isJson: boolean, modifyFlatten: boolean) {

        if (modifyFlatten && isJson ) {
            NodeHelper.setFlatten(node, false /*flatten*/, true /*overwrite flag*/);
        }
        NodeHelper.setCliProperty(node, NodeHelper.JSON, isJson);
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
    public static setCliKey(node: M4Node, value) {
        NodeHelper.setCliProperty(node, NodeHelper.CLI_KEY, value);
    }

    /**
     * get node.language.cli.cliKey
     * @param node
     */
    public static getCliKey(node: M4Node) {
        return isNullOrUndefined(node.language[NodeHelper.CLI]) ? '<missing_cli_key>' : node.language[NodeHelper.CLI][NodeHelper.CLI_KEY];
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

    public static getCliProperty(node: M4Node, propertyName: string, defaultWhenNotExist: () => any): any {
        if (isNullOrUndefined(node.language[NodeHelper.CLI])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                defaultWhenNotExist();
        }
        if (isNullOrUndefined(node.language[NodeHelper.CLI][propertyName])) {
            if (isNullOrUndefined(defaultWhenNotExist))
                return undefined;
            else
                return defaultWhenNotExist();
        }
        return node.language[NodeHelper.CLI][propertyName];
    }
}