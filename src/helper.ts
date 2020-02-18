import { isNullOrUndefined, isUndefined, isNull, isString, isArray, isObject } from "util";
import { Metadata, OperationGroup, Operation, Parameter, CodeModel } from "@azure-tools/codemodel";
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

    public static UpcaseFirstLetter(str: string) {
        if (this.isEmptyString(str))
            return str;
        if (str.length == 1)
            return str.toUpperCase();
        return str[0].toUpperCase().concat(str.substr(1).toLowerCase());
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
            return 'parameter'
        throw Error(`Unexpected metadata type: ${typeof (metadata)}`);
    }

    public static generateReport(codeModel: CodeModel): string {
        const INDENT = 2;
        const NEW_LINE = '\n';
        // TODO: refactor the yaml simple parser to helper
        let withIndent = (i: number, s: string = '') => `${' '.repeat(i)}${s}`;
        let nextIndent = (i, level = 1) => i + INDENT * level;
        let formatValue = (o: any, i: number) => {
            if (isString(o))
                return o;
            else if (isArray(o))
                return o.map(v => NEW_LINE + withIndent(i, "- " + formatValue(v, nextIndent(i, 2 /* one more indent for array*/)))).join('');
            else if (isObject(o))
                return keys(o).select(k => NEW_LINE + `${withIndent(i, k)}: ${formatValue(o[k], nextIndent(i))}`).join('');
            else
                return o.toString();
        };
        let generateCliValue = (o: any, i: number) => o.language.default.name +
            (isNullOrUndefined(o.language.cli) ? '' : Object.getOwnPropertyNames(o.language.cli)
                .filter(key => o.language.cli[key] !== o.language.default[key])
                .reduce((pv, cv, ci) => pv.concat((ci === 0 ? NEW_LINE + withIndent(i, 'cli:') : '') +
                    NEW_LINE + `${withIndent(nextIndent(i), cv)}: ${formatValue(o.language.cli[cv], nextIndent(i, 2 /*next next level*/))}`), ''));

        // TODO: include schema... when we support schema in modifier
        let initialIndent = 0;
        return `${withIndent(initialIndent)}operationGroups:${NEW_LINE}`.concat(
            codeModel.operationGroups.map(
                v => `${withIndent(initialIndent)}- operationGroupName: ${generateCliValue(v, nextIndent(initialIndent))}` +
                    `${NEW_LINE}${withIndent(nextIndent(initialIndent))}operations:${NEW_LINE}`.concat(
                        v.operations.map(vv => `${withIndent(nextIndent(initialIndent))}- operationName: ${generateCliValue(vv, nextIndent(initialIndent, 2))}` +
                            `${NEW_LINE}${withIndent(nextIndent(initialIndent, 2))}parameters:${NEW_LINE}`.concat(
                                vv.request.parameters.map(vvv => `${withIndent(nextIndent(initialIndent, 2))}- parameterName: ${generateCliValue(vvv, nextIndent(initialIndent, 3))}` + NEW_LINE)
                                    .join(''))
                        ).join(''))
            ).join(''));
    }
}