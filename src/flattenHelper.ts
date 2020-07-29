import { getAllProperties, ImplementationLocation, ObjectSchema, Parameter, Property, Request, VirtualParameter } from "@azure-tools/codemodel";
import { values } from "@azure-tools/linq";
import { isNullOrUndefined } from "util";
import { Helper } from "./helper";
import { NodeExtensionHelper, NodeCliHelper } from "./nodeHelper";

export class FlattenHelper {

    public static flattenParameter(req: Request, param: Parameter, path: Property[], prefix: string): void {
        if (!Helper.isObjectSchema(param.schema))
            throw Error(`Try to flatten non-object schema: param = '${param.language.default.name}', schema= '${param.schema.language.default.name}'`);

        FlattenHelper.flattenPorperties(req, param, param.schema as ObjectSchema, path, prefix);
        req.updateSignatureParameters();
    }

    public static createFlattenedParameterDefaultName(baseProperty: Property, prefix: string): string {
        return `${prefix}_${baseProperty.language.default.name}`;
    }

    public static createFlattenedParameterCliName(baseProperty: Property, prefix: string): string {
        return `${prefix}_${baseProperty.language['cli'].name}`;
    }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (<any>vp).serializedName;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (<any>vp).readOnly;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (<any>vp).isDiscriminator;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        NodeExtensionHelper.setCliFlattened(parameter, true);

        // we need this for the further flatten be recognized by python codegen
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const protocal: any = {
            http: {
                in: 'body'
            },
            style: 'json'
        };
        parameter.protocol = protocal;

        const arr: Parameter[] = [];
        for (const property of values(getAllProperties(schema))) {
            if (property.readOnly) {
                // skip read-only properties
                continue;
            }
            for (const vp of this.getFlattenedParameters(parameter, property, path)) {
                vp.language.default.name = FlattenHelper.createFlattenedParameterDefaultName(property, prefix);
                NodeCliHelper.setCliFlattenedNames(vp, [NodeCliHelper.getCliKey(parameter, null), NodeCliHelper.getCliKey(property, null)]);
                NodeExtensionHelper.setCliFlattenOrigin(vp, property);
                NodeExtensionHelper.setCliFlattenPrefix(vp, prefix);
                arr.push(vp);
            }
        }

        const arr2: Parameter[] = [];
        const hash: Set<string> = new Set<string>();
        // base class's property is before the subclass's
        for (let i = 0; i < arr.length; i++) {
            const cur = arr[i];
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
}