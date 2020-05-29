import { Request, Parameter, Operation, Schema } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";

export class CopyHelper {

    public static copyOperation(source: Operation, globalParameters?: Parameter[], customizedReqCopy?: (req: Request) => Request, customizedParamCopy?: (srcParam: Parameter) => Parameter): Operation {
        const copy = new Operation(source.language.default.name, '', source);
        copy.language = CopyHelper.deepCopy(source.language);
        copy.extensions = CopyHelper.copy(source.extensions);
        copy.parameters = source.parameters?.map((op) => {
            if (globalParameters?.find((gp) => gp === op)) {
                return op;
            } else if (customizedParamCopy) {
                return customizedParamCopy(op);
            } else {
                return CopyHelper.copyParameter(op)
            }
        });
        copy.requests = source.requests?.map((req) => customizedReqCopy == null ? CopyHelper.copyRequest(req) : customizedReqCopy(req));
        copy.updateSignatureParameters();
        return copy;
    }

    public static copyRequest(source: Request, customizedParamCopy?: (param: Parameter) => Parameter): Request {
        const copy = new Request(source);
        copy.extensions = CopyHelper.copy(source.extensions);
        copy.language = CopyHelper.deepCopy(source.language);
        copy.parameters = copy.parameters?.map((p) => customizedParamCopy == null ? CopyHelper.copyParameter(p) : customizedParamCopy(p));
        copy.updateSignatureParameters();
        return copy;
    }

    public static copyParameter(source: Parameter, customizedSchema?: Schema): Parameter {
        const copy = new Parameter(source.language.default.name, source.language.default.description, customizedSchema ?? source.schema, {
            implementation: source.implementation,
            extensions: {},
            language: CopyHelper.deepCopy(source.language),
            protocol: source.protocol,
        });
        for (const property in source) {
            if (isNullOrUndefined(copy[property])) {
                copy[property] = source[property];
            }
        }
        return copy;
    }

    public static copy<T>(source: T): T {
        if (source == null) {
            return source;
        }
        return Object.assign({}, source);
    }

    public static deepCopy<T>(source: T): T {
        if (source == null) {
            return source;
        }
        return JSON.parse(JSON.stringify(source));
    }
}
