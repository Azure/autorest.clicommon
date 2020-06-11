import { getAllProperties, ImplementationLocation, ObjectSchema, Parameter, Property, Request, VirtualParameter } from "@azure-tools/codemodel";
import { values } from "@azure-tools/linq";
import { isNull, isNullOrUndefined } from "util";
import { NodeHelper } from "./nodeHelper";

export class FlattenHelper {

    private static *getFlattenedParameters(parameter: Parameter, property: Property, path: Array<Property> = []): Iterable<VirtualParameter> {
        if (property.readOnly) {
            // skip read-only properties
            return;
        }
        const vp = new VirtualParameter( property.language.default.name, property.language.default.description, property.schema, {
            ...property,
            implementation: ImplementationLocation.Method,
            originalParameter: parameter,
            targetProperty: property,
            pathToProperty: path
        });
        delete (<any>vp).serializedName;
        delete (<any>vp).readOnly;
        delete (<any>vp).isDiscriminator;
        delete (<any>vp).flattenedNames;

        vp.language = JSON.parse(JSON.stringify(vp.language));
        // if the parameter has "x-ms-parameter-grouping" extension, (and this is a top level parameter) then we should copy that to the vp.
        if (path.length === 0 && parameter.extensions?.['x-ms-parameter-grouping']) {
            (vp.extensions = vp.extensions || {})['x-ms-parameter-grouping'] = parameter.extensions?.['x-ms-parameter-grouping'];
        }

        yield vp;
    }

    private static flattenPorperties(request: Request, parameter: Parameter, schema: ObjectSchema, path: Property[], prefix: string) {
        // hide the original parameter
        parameter.flattened = true;
        NodeHelper.setFlattenedParam(parameter, true);

        // we need this for the further flatten be recognized by python codegen
        let protocal: any = {
            http: {
                in: 'body'
            },
            style: 'json'
        };
        parameter.protocol = protocal;

        let arr: Parameter[] = [];
        for (const property of values(getAllProperties(schema))) {
            if (property.readOnly) {
                // skip read-only properties
                continue;
            }
            for (const vp of this.getFlattenedParameters(parameter, property, path)) {
                vp.language.default.name = `${prefix}${vp.language.default.name}`;
                if (vp.language['cli'].name) {
                    vp.language['cli'].name = `${prefix}${vp.language['cli'].name}`;
                }
                NodeHelper.setCliFlattenedNames(vp, [NodeHelper.getCliKey(parameter, null), NodeHelper.getCliKey(property, null)]);
                arr.push(vp);
            }
        }

        let arr2: Parameter[] = [];
        let hash: Set<string> = new Set<string>();
        // base class's property is before the subclass's
        for (let i = 0; i < arr.length; i++) {
            let cur = arr[i];
            if (!hash.has(cur.language.default.name)) {
                arr2.push(cur);
                hash.add(cur.language.default.name);
            }
        }

        if (arr2.length > 0) {
            if (isNullOrUndefined(request.parameters))
                request.parameters = [];
            request.parameters = request.parameters.concat(arr2);
        }
    }


    public static flattenParameter(req: Request, param: Parameter, path: Property[], prefix: string) {
        if (!(param.schema instanceof ObjectSchema))
            throw Error(`Try to flatten non-object schema: param = '${param.language.default.name}', schema= '${param.schema.language.default.name}'`);

        FlattenHelper.flattenPorperties(req, param, param.schema as ObjectSchema, path, prefix);
        req.updateSignatureParameters();
    }
}