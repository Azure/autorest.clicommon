import { Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Operation, Request, ObjectSchema, ParameterLocation, ImplementationLocation, isObjectSchema, getAllProperties, SchemaType, Property, getAllParentProperties, Parameter, isVirtualParameter } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { items, refCount, values, length, Dictionary } from "@azure-tools/linq";
import { deconstruct, fixLeadingNumber, removeSequentialDuplicates, selectName, Style } from "@azure-tools/codegen";
import { Helper } from "./helper";
import { CliCommonSchema, CliConst, M4Node } from "./schema";
import { NodeCliHelper, NodeExtensionHelper, NodeHelper } from "./nodeHelper";
import { CopyHelper } from "./copyHelper";
import { FlattenHelper } from "./flattenHelper";

export interface FlattenSetting {
    flattenEnabled: boolean;
    propNumThreshold: number;
    keepUnusedModel: boolean;
    flattenMultiReqPayload: boolean;
    flattenPayload: boolean;
    polyEnabled: boolean;
}

const hasBeenFlattened = 'cli-x-ms-flattened';
const isCurrentlyFlattening = 'cli-x-ms-flattening';

export class Flattener {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private namingOptions: Dictionary<any> = {};
    private namingFormat = {
        parameter: Style.camel,
        property: Style.camel,
        operation: Style.pascal,
        operationGroup: Style.pascal,
        choice: Style.pascal,
        choiceValue: Style.pascal,
        constant: Style.pascal,
        constantParameter: Style.camel,
        type: Style.pascal,
        client: Style.pascal,
        local: Style.camel,
        global: Style.pascal,
        override: <Dictionary<string>>{}
    }

    constructor(protected session: Session<CodeModel>, protected isFlattenTarget: (node: M4Node, isPayload?: boolean) => boolean,
        protected onAfterFlatten?: (node: M4Node) => void){
        if (isNullOrUndefined(onAfterFlatten)) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this.onAfterFlatten = () => {};
        }
    }

    public async process(setting: FlattenSetting): Promise<void> {
        if (!setting.flattenEnabled) {
            Helper.logDebug(this.session, `${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} is false. Skip flatten.`);
            return;
        }

        this.processSchema(setting);

        if (setting.flattenPayload) {
            this.flattenPayload(setting.flattenMultiReqPayload, setting.propNumThreshold);
        }

        this.flattenOperationParameter(setting.polyEnabled);

        this.namingOptions = await this.session.getValue('modelerfour', {});
        const naming = this.namingOptions.naming || {};
        const maxPreserve = Number(naming['preserve-uppercase-max-length']) || 3;
        this.namingFormat = {
            parameter: Style.select(naming.parameter, Style.camel, maxPreserve),
            property: Style.select(naming.property, Style.camel, maxPreserve),
            operation: Style.select(naming.operation, Style.pascal, maxPreserve),
            operationGroup: Style.select(naming.operationGroup, Style.pascal, maxPreserve),
            choice: Style.select(naming.choice, Style.pascal, maxPreserve),
            choiceValue: Style.select(naming.choiceValue, Style.pascal, maxPreserve),
            constant: Style.select(naming.constant, Style.pascal, maxPreserve),
            constantParameter: Style.select(naming.constantParameter, Style.camel, maxPreserve),
            client: Style.select(naming.client, Style.pascal, maxPreserve),
            type: Style.select(naming.type, Style.pascal, maxPreserve),
            local: Style.select(naming.local, Style.camel, maxPreserve),
            global: Style.select(naming.global, Style.pascal, maxPreserve),
            override: naming.override || {}
        };

        this.fixPropertyCollisions();

        this.fixParameterCollisions();
    }

    private processSchema(setting: FlattenSetting): void {
        this.session.model.schemas.objects?.forEach((schema) => {
            this.flattenSchema(schema);
        });

        if (!setting.keepUnusedModel) {
            this.removeUnusedModel();
        }

        for (const schema of values(this.session.model.schemas.objects)) {
            if (schema.extensions) {
                delete schema.extensions[isCurrentlyFlattening];
                // don't want this until I have removed the unreferenced models.
                // delete schema.extensions[hasBeenFlattened];
                if (length(schema.extensions) === 0) {
                    delete schema['extensions'];
                }
            }
        }
    }

    private flattenSchema(schema: ObjectSchema): void {
        const state = schema.extensions?.[isCurrentlyFlattening];

        if (state === false) {
            // already done.
            return;
        }

        if (state === true) {
            // in progress.
            throw new Error(`Circular reference encountered during processing of x-ms-client flatten ('${schema.language.default.name}')`);
        }

        // hasn't started yet.
        schema.extensions = schema.extensions || {};
        schema.extensions[isCurrentlyFlattening] = true;

        // ensure that parent schemas are done first -- this should remove 
        // the problem when the order isn't just right.
        for (const parent of values(schema.parents?.immediate)) {
            if (isObjectSchema(parent)) {
                this.flattenSchema(parent);
            }
        }

        if (schema.properties) {
            for (const { key: index, value: property } of items(schema.properties).toArray().reverse()) {

                if (isObjectSchema(property.schema) && this.isFlattenTarget(property) && !NodeCliHelper.isCliFlattened(property)) {
                    // first, ensure tha the child is pre-flattened
                    this.flattenSchema(property.schema);

                    // remove that property from the scheama
                    schema.properties.splice(index, 1);

                    // copy all of the properties from the child into this schema 
                    for (const childProperty of values(getAllProperties(property.schema))) {
                        const parentFlattenedNames = property.flattenedNames ?? [property.serializedName];
                        const newProp = new Property(childProperty.language.default.name, childProperty.language.default.description, childProperty.schema, {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ...(<any>childProperty),
                            flattenedNames: [...parentFlattenedNames, ...childProperty.flattenedNames ? childProperty.flattenedNames : [childProperty.serializedName]],
                            required: property.required && childProperty.required
                        });
                        schema.addProperty(newProp);

                        if (!isNullOrUndefined(newProp.language['cli'])) {
                            newProp.language['cli'] = CopyHelper.deepCopy(newProp.language['cli']);
                            const cli = newProp.language['cli'];
                            delete cli[NodeCliHelper.CLI_M4_PATH];
                        }

                        const trace = NodeCliHelper.getCliFlattenTrace(newProp) ?? [NodeCliHelper.getCliM4Path(childProperty)];
                        const parentTrace = NodeCliHelper.getCliFlattenTrace(property) ?? [NodeCliHelper.getCliM4Path(property)];
                        trace.splice(0, 0, ...parentTrace);
                        NodeCliHelper.setCliFlattenTrace(newProp, trace);
                    }

                    if (length(property.extensions) === 0) {
                        delete property['extensions'];
                    }
                    // and mark the child class as 'do-not-generate' ?
                    (property.schema.extensions = property.schema.extensions || {})[hasBeenFlattened] = true;
                    NodeCliHelper.setCliFlattened(property.schema, true);
                    this.onAfterFlatten(property.schema);
                }
            }
        }

        schema.extensions[isCurrentlyFlattening] = false;
    }

    private flattenPayload(flattenMultiPayload: boolean, propNumThreshold: number): void {
        for (const group of this.session.model.operationGroups) {
            for (const operation of group.operations) {
                // when there are multiple requests in an operation
                // and the generator asks not to flatten them
                if (length(operation.requests) > 1 && !flattenMultiPayload) {
                    continue;
                }

                for (const request of values(operation.requests)) {
                    if (NodeCliHelper.isCliPayloadFlattened(request)) {
                        continue;
                    }

                    const body = values(request.parameters).first(p => p.protocol.http?.in === ParameterLocation.Body && p.implementation === ImplementationLocation.Method);

                    if (body && isObjectSchema(body.schema)) {
                        const schema = <ObjectSchema>body.schema;
                        if (schema.discriminator) {
                            // skip flattening on polymorphic payloads, since you don't know the actual type.
                            continue;
                        }

                        let flattenOperationPayload = this.isFlattenTarget(body, true) && !NodeCliHelper.isCliFlattened(body) && !body.flattened;
                        if (!flattenOperationPayload) {
                            // told not to explicitly.
                            continue;
                        }

                        // get the count of the (non-readonly) properties in the schema
                        if (propNumThreshold > 0) {
                            flattenOperationPayload = length(values(getAllProperties(schema)).where(property => property.readOnly !== true && property.schema.type !== SchemaType.Constant)) <= propNumThreshold;
                        }

                        if (flattenOperationPayload) {
                            // For backward compatiable. Follow flatten payload logic in modelerfour .
                            FlattenHelper.flattenParameter(request, body, [], '', true);
                            this.onAfterFlatten(body);

                            NodeCliHelper.setCliPayloadFlattened(request, true);
                        }
                    }
                }
            }
        }
    }

    private flattenOperationParameter(polyEnabled: boolean): void {
        if (polyEnabled) {
            Helper.enumrateOperationGroups(this.session.model.operationGroups, [], (desc) => this.flattenPolyOperationParameter(desc), CliCommonSchema.CodeModel.NodeTypeFlag.operation);
        }
        Helper.enumrateOperationGroups(this.session.model.operationGroups, [], (desc) => this.flattenNormalOperationParameters(desc), CliCommonSchema.CodeModel.NodeTypeFlag.operation);
    }

    private removeUnusedModel(): void {
        let dirty = false;
        do {
            // reset on every pass
            dirty = false;
            // remove unreferenced models 
            for (const { key, value: schema } of items(this.session.model.schemas.objects).toArray()) {
                // only remove unreferenced models that have been flattened.
                if (!schema.extensions?.[hasBeenFlattened]) {
                    continue;
                }

                if (schema.discriminatorValue || schema.discriminator) {
                    // it's polymorphic -- I don't think we can remove this 
                    continue;
                }

                if (schema.children?.all || schema.parents?.all) {
                    // it's got either a parent or child schema. 
                    continue;
                }

                if (refCount(this.session.model.schemas.objects, schema) === 1) {
                    this.session.model.schemas.objects?.splice(key, 1);
                    dirty = true;
                    break;
                }
            }
        } while (dirty);
    }
    
    private flattenPolyOperationParameter(desc: CliCommonSchema.CodeModel.NodeDescriptor): void {
        if (!this.isCliOperation(desc)) {
            return;
        }
        const operation = desc.target as Operation;
        const polyParam = NodeExtensionHelper.getPolyAsResourceParam(operation);
        const subClass = polyParam.schema as ObjectSchema;
        const discriminatorValue = NodeCliHelper.getCliDiscriminatorValue(subClass);
        if (isNullOrUndefined(polyParam)) {
            Helper.logWarning(this.session, `operation ${NodeCliHelper.getCliKey(operation, null)} has no poly parameter! Skip flatten`);
            return;
        }

        const request = operation.requests?.[0];
        if (!request) {
            Helper.logWarning(this.session, `operation ${NodeCliHelper.getCliKey(operation, null)} has no request! Skip flatten`);
            return;
        }
        if (NodeHelper.getJson(subClass) !== true && !NodeCliHelper.isCliFlattened(polyParam)) {
            const path = isNullOrUndefined(polyParam['targetProperty']) ? [] : [polyParam['targetProperty']];
            FlattenHelper.flattenParameter(request, polyParam, path, `${Helper.camelToSnake(discriminatorValue)}_`);
            this.onAfterFlatten(polyParam);
        }
    }

    private flattenNormalOperationParameters(desc: CliCommonSchema.CodeModel.NodeDescriptor): void {
        if (this.isCliOperation(desc)) {
            return;
        }
        const operation = desc.target as Operation;
        const request = operation.requests?.[0];
        if (isNullOrUndefined(request) || isNullOrUndefined(request.parameters)) {
            return;
        }

        let foundFlattenParam = true;
        while (foundFlattenParam) {

            foundFlattenParam = false;

            for (let i = 0; i < request.parameters.length; i++) {
                const param = request.parameters[i];
                if (!this.isFlattenTarget(param) || NodeCliHelper.isCliFlattened(param)) {
                    continue;
                }
                

                if (this.flattenNormalOperationParameter(request, i)) {
                    // After flatten, index is changed. Break to start another round loop
                    foundFlattenParam = true;
                    break;
                }
            }
        }
    }

    private flattenNormalOperationParameter(request: Request, index: number): boolean {
        const parameter = request.parameters[index];
        const paramSchema = parameter.schema;
        if (!Helper.isObjectSchema(paramSchema)) {
            Helper.logWarning(this.session, `flatten param ${NodeCliHelper.getCliKey(parameter, null)} is not object! Skip flatten`);
            return false;
        }
        if (NodeHelper.getJson(paramSchema) !== true && !parameter.flattened) {
            
            // Parameter may be shared by other request even schema. To prevent our changes spread to other place, clone the parameter
            const clonedParam = CopyHelper.copyParameter(parameter);
            NodeCliHelper.setCliM4Path(clonedParam, NodeCliHelper.getCliM4Path(parameter));
            request.parameters[index] = clonedParam;
            
            const path = isNullOrUndefined(clonedParam['targetProperty']) ? [] : [clonedParam['targetProperty']];
            // Use parameter's default name as perfix
            FlattenHelper.flattenParameter(request, clonedParam, path, '');
            this.onAfterFlatten(clonedParam);
            
            return true;
        }
        return false;
    }

    private isCliOperation(desc: CliCommonSchema.CodeModel.NodeDescriptor): boolean {
        // CliOperation is not in group.operations. So its index is equal or bigger than operation array(desc.parent)'s length
        const operation = desc.target as Operation;
        return !isNullOrUndefined(NodeExtensionHelper.getPolyAsResourceOriginalOperation(operation));
    }

    private fixPropertyCollisions() {
        for (const schema of values(this.session.model.schemas.objects)) {
            this.fixCollisions(schema);
        }
    }

    private fixCollisions(schema: ObjectSchema) {
        for (const each of values(schema.parents?.immediate).where(each => isObjectSchema(each))) {
            this.fixCollisions(<ObjectSchema>each);
        }
        const [owned, flattened] = values(schema.properties).bifurcate(each => length(each.flattenedNames) === 0);
        const inherited = [...getAllParentProperties(schema)];
    
        const all = [...owned, ...inherited, ...flattened];
    
        const inlined = new Map<string, number>();
        for (const each of all) {
            const name = this.namingFormat.property(each.language.default.name);
            // track number of instances of a given name.
            inlined.set(name, (inlined.get(name) || 0) + 1);
        }
    
        const usedNames = new Set(inlined.keys());
        for (const each of flattened /*.sort((a, b) => length(a.nameOptions) - length(b.nameOptions)) */) {
            const ct = inlined.get(this.namingFormat.property(each.language.default.name));
            if (ct && ct > 1) {
                const options = this.getNameOptions(each.schema.language.default.name, [each.language.default.name, ...values(each.flattenedNames)]);
                each.language.default.name = this.namingFormat.property(selectName(options, usedNames));
            }
        }
    }
    
    private fixParameterCollisions() {
        for (const operation of values(this.session.model.operationGroups).selectMany(each => each.operations)) {
            for (const request of values(operation.requests)) {
                const parameters = values(operation.signatureParameters).concat(values(request.signatureParameters));
                
                const usedNames = new Set<string>();
                const collisions = new Set<Parameter>();
    
                // we need to make sure we avoid name collisions. operation parameters get first crack.
                for (const each of values(parameters)) {
                    const name = this.namingFormat.parameter(each.language.default.name);
                    
                    if (usedNames.has(name)) {
                        collisions.add(each);
                    } else {
                        usedNames.add(name);
                    }
                }
                
                // handle operation parameters
                for (const parameter of collisions) {
                    let options = [parameter.language.default.name];
                    if (isVirtualParameter(parameter)) {
                        options = this.getNameOptions(parameter.schema.language.default.name, [parameter.language.default.name, ...parameter.pathToProperty.map(each => each.language.default.name)]).map(each => this.namingFormat.parameter(each));
                    }
                    parameter.language.default.name = this.namingFormat.parameter(selectName(options, usedNames));
                }
            }
        }
    }

    private getNameOptions(typeName: string, components: Array<string>) {
        const result = new Set<string>();
      
        // add a variant for each incrementally inclusive parent naming scheme.
        for (let i = 0; i < length(components); i++) {
            const subset = Style.pascal([...removeSequentialDuplicates(components.slice(-1 * i, length(components)))]);
            result.add(subset);
        }
      
        // add a second-to-last-ditch option as <typename>.<name>
        result.add(Style.pascal([...removeSequentialDuplicates([...fixLeadingNumber(deconstruct(typeName)), ...deconstruct(components.last)])]));
        return [...result.values()];
    }
}
