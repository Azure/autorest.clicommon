import { isNullOrUndefined, isUndefined, isNull, isString, isArray, isObject } from "util";
import { Metadata, OperationGroup, Operation, Parameter, CodeModel, ObjectSchema, Property } from "@azure-tools/codemodel";
import { SelectType } from "./schema";
import { indent } from "@azure-tools/codegen";
import { keys } from "@azure-tools/linq";

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

    public static ToSelectType(metadata: Metadata): SelectType {
        if (metadata instanceof OperationGroup)
            return 'operationGroup';
        else if (metadata instanceof Operation)
            return 'operation';
        else if (metadata instanceof Parameter)
            return 'parameter';
        else if (metadata instanceof ObjectSchema)
            return 'objectSchema';
        else if (metadata instanceof Property)
            return 'property';
        throw Error(`Unexpected metadata type: ${typeof (metadata)}`);
    }

    public static generateReport(codeModel: CodeModel): string {
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
                    NEW_LINE + tab(i + 1) + `${cv}: ${formatValue(o.language.cli[cv], i + 2 /*next next level*/)}`), ''));

        // TODO: include schema... when we support schema in modifier
        let s = '';
        s = s + `operationGroups:${NEW_LINE}` +
            `${tab()}all:${NEW_LINE}`.concat(codeModel.operationGroups.map(
                v => `${tab(1)}- operationGroupName: ${generateCliValue(v, 2)}` +
                    `${NEW_LINE}${tab(2)}operations:${NEW_LINE}`.concat(
                        v.operations.map(vv => `${tab(2)}- operationName: ${generateCliValue(vv, 3)}` +
                            `${NEW_LINE}${tab(3)}parameters:${NEW_LINE}`.concat(
                                vv.request.parameters.map(vvv => `${tab(3)}- parameterName: ${generateCliValue(vvv, 4)}${NEW_LINE}` +
                                    ((vvv.protocol.http.in === 'body')?`${tab(4)}bodySchema: ${vvv.schema.language.default.name}${NEW_LINE}` : ''))
                                    .join(''))
                        ).join(''))
            ).join(''));
        s = s + `schemas:${NEW_LINE}` +
            `${tab()}objects:${NEW_LINE}` +
            `${tab(1)}all:${NEW_LINE}`.concat(codeModel.schemas.objects.map(
                v => `${tab(2)}- schemaName: ${generateCliValue(v, 3)}` +
                    `${NEW_LINE}${tab(3)}properties:${NEW_LINE}`.concat(
                        v.properties.map(vv => `${tab(4)}- propertyName: ${generateCliValue(vv, 5)}${NEW_LINE}`)
                            .join('')))
                .join(''));
        return s;
    }

    public static generateSchemaSection(codeModel: CodeModel) {

    }
}