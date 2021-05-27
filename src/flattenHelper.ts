import { getAllProperties, ImplementationLocation, ObjectSchema, Parameter, Property, Request, VirtualParameter } from "@azure-tools/codemodel";
import { values } from "@azure-tools/linq";
import { isNullOrUndefined } from "util";
import { Helper } from "./helper";
import { NodeExtensionHelper, NodeCliHelper } from "./nodeHelper";
import { CopyHelper } from "./copyHelper";

export class FlattenHelper {

    public static flattenParameter(req: Request, param: Parameter, path: Property[], prefix: string, isPayloadFlatten = false): void {
        if (!Helper.isObjectSchema(param.schema))
            throw Error(`Try to flatten non-object schema: param = '${param.language.default.name}', schema= '${param.schema.language.default.name}'`);

        FlattenHelper.flattenPorperties(req, param, param.schema as ObjectSchema, path, prefix, isPayloadFlatten);
        req.updateSignatureParameters();
    }

    public static createFlattenedParameterDefaultName(baseProperty: Property, prefix: string): string {
        return `${prefix}${baseProperty.language.default.name}`;
    }

    public static createFlattenedParameterCliName(baseProperty: Property, prefix: string): string {
        return `${prefix}${baseProperty.language['cli'].name}`;
    }


    private static flattenPorperties(request: Request, parameter: Parameter, schema: ObjectSchema, path: Property[], prefix: string, isPayloadFlatten = false) {
        // hide the original parameter
        parameter.flattened = true;
        NodeCliHelper.setCliFlattened(parameter, true);

        // DO WE NEED THIS?
        // we need this for the further flatten be recognized by python codegen
        if (!isPayloadFlatten) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const protocal: any = {
                http: {
                    in: 'body'
                },
                style: 'json'
            };
            parameter.protocol = protocal;
        }

        const arr: Parameter[] = [];
        const ownPropM4Paths = new Set<string>();
        schema.properties?.forEach((prop) => {
            ownPropM4Paths.add(prop.language?.['cli']?.[NodeCliHelper.CLI_M4_PATH]);
        });
        const schemaPath = NodeCliHelper.getCliM4Path(schema);

        for (const property of values(getAllProperties(schema))) {
            if (property.readOnly) {
                // skip read-only properties
                continue;
            }
            for (const vp of this.getFlattenedParameters(parameter, property, path)) {
                vp.language.default.name = FlattenHelper.createFlattenedParameterDefaultName(property, prefix);
                NodeExtensionHelper.setCliFlattenOrigin(vp, property);
                NodeExtensionHelper.setCliFlattenPrefix(vp, prefix);
                if (property.isDiscriminator) {
                    NodeExtensionHelper.setCliDiscriminatorValue(vp, parameter.schema['discriminatorValue']);
                }
                arr.push(vp);

                // if prop is inherit, update path
                if (!ownPropM4Paths.has(NodeCliHelper.getCliM4Path(property))) {
                    const propCliKey = NodeCliHelper.getCliKey(property, null);
                    const flattenTrace = NodeCliHelper.getCliFlattenTrace(vp);
                    flattenTrace[flattenTrace.length - 1] = `${schemaPath}${Helper.M4_PATH_SEPARATOR}properties['${propCliKey}']`;
                }
            }
        }

        if (arr.length > 0) {
            if (isNullOrUndefined(request.parameters)) {
                request.parameters = [];
            }
            const index = request.parameters.findIndex((param) => param === parameter);
            request.parameters.splice(index + 1, 0, ...arr);
        }
    }

    private static *getFlattenedParameters(parameter: Parameter, property: Property, path: Array<Property> = []): Iterable<VirtualParameter> {
        if (property.readOnly) {
            // skip read-only properties
            return;
        }
        const vp = new VirtualParameter(property.language.default.name, property.language.default.description, property.schema, {
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

        // avoid multiple vp share same language instance
        vp.language = CopyHelper.copyLanguage(vp.language);

        // Flatten trace is in format:
        // - <original parameter m4path>
        // - <property path1>
        // - <property path2>
        // - ...
        const paramFlattenTrace = NodeCliHelper.getCliFlattenTrace(parameter) ?? [];
        const propFlattenTrace = CopyHelper.deepCopy(paramFlattenTrace);
        propFlattenTrace.push(NodeCliHelper.getCliM4Path(parameter));

        const propSchemaTrace = NodeCliHelper.getCliFlattenTrace(property) ?? [];
        propFlattenTrace.push(...propSchemaTrace);
        const propCliKey = NodeCliHelper.getCliM4Path(property);
        
        if (propFlattenTrace.last !== propCliKey) {
            propFlattenTrace.push(NodeCliHelper.getCliM4Path(property));
            NodeCliHelper.setCliFlattenTrace(vp, propFlattenTrace);
        }

        vp.required = parameter.required && property.required;
        if (NodeCliHelper.getHidden(property.schema, false)) {
            NodeCliHelper.setHidden(vp, true);
        }
        const cliDefaultValue = NodeCliHelper.getCliDefaultValue(property.schema);
        if (cliDefaultValue !== undefined) {
            NodeCliHelper.setCliDefaultValue(vp, cliDefaultValue);
        }

        // if the parameter has "x-ms-parameter-grouping" extension, (and this is a top level parameter) then we should copy that to the vp.
        if (path.length === 0 && parameter.extensions?.['x-ms-parameter-grouping']) {
            (vp.extensions = vp.extensions || {})['x-ms-parameter-grouping'] = parameter.extensions?.['x-ms-parameter-grouping'];
        }

        yield vp;
    }
}