import { Operation } from "@azure-tools/codemodel";
import { NodeHelper } from "./nodeHelper";
import { isNullOrUndefined } from "util";

export class PolyHelper {
    public static createPolyOperationDefaultName(baseOperation: Operation, discriminatorValue: string): string {
        return `${baseOperation.language.default.name}_${discriminatorValue}`;
    }

    public static createPolyOperationCliKey(baseOperation: Operation, discriminatorValue: string): string {
        return `${NodeHelper.getCliKey(baseOperation, baseOperation.language.default.name)}#${discriminatorValue}`
    }
    
    public static createPolyOperationCliName(baseOperation: Operation, discriminatorValue: string): string {
        return `${NodeHelper.getCliName(baseOperation, baseOperation.language.default.name)}#${discriminatorValue}`
    }

    public static getDiscriminatorValue(polyOperation: Operation): string {
        const cliKey = NodeHelper.getCliKey(polyOperation, null);
        if (isNullOrUndefined(cliKey)) {
            return null;
        }
        const arr = (cliKey as string).split('#');
        if (!arr || arr.length !== 2) {
            return null;
        }
        return arr[1];
    }
}