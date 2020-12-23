import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, ObjectSchema, isObjectSchema, getAllProperties, Parameter, Schema, ArraySchema, codeModelSchema } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../../helper";
import { NodeHelper, NodeCliHelper } from "../../nodeHelper";
import { CliConst, CliCommonSchema } from "../../schema";
import { CliDirectiveManager } from "../modifier/cliDirective";
import { Modifier } from "../modifier/modifier";
import { FlattenValidator } from "./flattenValidator";
import { values } from "@azure-tools/linq";
import { ActionHitCount } from "../modifier/cliDirectiveAction";

class flattenInfo {
    public constructor(public propCount: number = 0, public complexity: number = 0) { }
}

interface FlattenConfig {
    maxComplexity: number;
    maxLevel: number;
    maxPropCount: number;
    maxPolyAsResourcePropCount: number;
    maxPolyAsParamPropCount: number;
    maxArrayPropCount: number;
    overwriteSwagger: boolean;
    nodeDescripter: CliCommonSchema.CodeModel.NodeDescriptor;
}

function cloneFlattenConfig(config: FlattenConfig): FlattenConfig {
    return {
        maxComplexity: config.maxComplexity,
        maxLevel: config.maxLevel,
        maxPropCount: config.maxPropCount,
        maxPolyAsParamPropCount: config.maxPolyAsParamPropCount,
        maxPolyAsResourcePropCount: config.maxPolyAsResourcePropCount,
        maxArrayPropCount: config.maxArrayPropCount,
        overwriteSwagger: config.overwriteSwagger,
        nodeDescripter: config.nodeDescripter,
    };
}

export class FlattenSetter {
    codeModel: CodeModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cliConfig: any;
    manager: CliDirectiveManager;


    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    private canArrayObjectSimplified(schema: Schema, maxArrayObjProp: number) {
        if (Helper.isObjectSchema(schema) && !NodeHelper.HasSubClass(schema as ObjectSchema)) {
            const sim = NodeCliHelper.getSimplifyIndicator(schema as ObjectSchema);
            return ((!isNullOrUndefined(sim)) && sim.simplifiable === true && sim.propertyCountIfSimplify <= maxArrayObjProp);
        }
        return false;
    }

    private canSubclassSimplified(schema: Schema, flattenConfig: FlattenConfig, isPolyAsResource: boolean) {
        if (Helper.isObjectSchema(schema) && !isNullOrUndefined((<ObjectSchema>schema).discriminatorValue) && !NodeHelper.HasSubClass(schema as ObjectSchema)) {
            const sim = NodeCliHelper.getSimplifyIndicator(schema as ObjectSchema);
            if (isPolyAsResource)
                return ((!isNullOrUndefined(sim)) && sim.simplifiable === true && sim.propertyCountIfSimplifyWithoutSimpleObject <= flattenConfig.maxPolyAsResourcePropCount);
            else
                return ((!isNullOrUndefined(sim)) && sim.simplifiable === true && sim.propertyCountIfSimplify <= flattenConfig.maxPolyAsParamPropCount);
        }
        return false;
    }

    /**
     * level N means this is the Nth flatten, 0 means no flatten done which means the top level
     * @param schema
     * @param info - should be pre-prepared
     * @param level
     */
    private calcSchemaForPayloadFlatten(schema: Schema, info: flattenInfo[], level: number, required: boolean, flattenConfig: FlattenConfig): number {

        const weight = required ? 1 : 0.5;

        const increasePropCount = () => {
            for (let i = level; i < info.length; i++)
                info[i].propCount++;
        };

        const increaseComplexity = () => {
            for (let i = level; i < info.length; i++)
                info[i].complexity = +weight;
        };

        let r = level;

        if (Helper.isArraySchema(schema)) {
            increasePropCount();
            if (NodeCliHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.array_complex) {
                if (!this.canArrayObjectSimplified(schema, flattenConfig.maxArrayPropCount))
                    increaseComplexity();
            }
        }
        else if (Helper.isDictionarySchema(schema)) {
            increasePropCount();
            if (NodeCliHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.dictionary_complex)
                increaseComplexity();
        }
        else if (Helper.isAnySchema(schema)) {
            increasePropCount();
            increaseComplexity();
        }
        // eslint-disable-next-line no-empty
        else if (Helper.isConstantSchema(schema)) {
        }
        else if (Helper.isObjectSchema(schema)) {
            if (NodeHelper.HasSubClass(schema as ObjectSchema)) {
                increasePropCount();
                increaseComplexity();
            }
            else if (NodeCliHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.object_simple) {
                increasePropCount();
            }
            else {
                info[level].propCount++;
                info[level].complexity += weight;
                for (const prop of getAllProperties(schema as ObjectSchema)) {
                    if (prop.readOnly)
                        continue;
                    if (level + 1 < info.length) {
                        r = this.calcSchemaForPayloadFlatten(prop.schema, info, level + 1, prop.required, flattenConfig);
                    }
                }
            }
        }
        else {
            increasePropCount();
        }
        return r;
    }

    private calcPayloadFlatten(paramSchema: Schema, flattenConfig: FlattenConfig): number {
        const defaultLevel = 1;
        const info: flattenInfo[] = [];
        const maxLevel = flattenConfig.maxLevel;
        const maxComplexity = flattenConfig.maxComplexity;
        const maxPropCount = flattenConfig.maxPropCount;
        for (let i = maxLevel; i >= 0; i--)
            info.push(new flattenInfo());

        const r = this.calcSchemaForPayloadFlatten(paramSchema, info, 0, true, flattenConfig);

        for (let i = 0; i <= r; i++) {
            Helper.logDebug(this.session, `Level-${i}: propCount=${info[i].propCount}, complexity=${info[i].complexity}`);
        }

        for (let i = r; i >= 0; i--) {
            if (info[i].propCount <= maxPropCount && info[i].complexity <= maxComplexity) {
                if (i == 0 && NodeCliHelper.getComplexity(paramSchema) === CliCommonSchema.CodeModel.Complexity.object_simple) {
                    Helper.logDebug(this.session, `flatten to level ${i} and adjusted to 1 for top level simple object with maxLevel=${maxLevel}, maxPropCount=${maxPropCount}, maxComplexity=${maxComplexity}`);
                    return 1;
                }
                else {
                    Helper.logDebug(this.session, `flatten to level ${i} with maxLevel=${maxLevel}, maxPropCount=${maxPropCount}, maxComplexity=${maxComplexity}`);
                    return i;
                }
            }
        }

        return defaultLevel;
    }

    private isPolyAsResource(schema: Schema, paramName: string, flattenConfig: FlattenConfig): boolean {

        ActionHitCount.hitCount = 0;
        const desc = flattenConfig.nodeDescripter;
        desc.parameterCliKey = paramName;
        this.manager.process(desc);
        return (ActionHitCount.hitCount > 0);
    }

    private flattenPolySchema(baseSchema: ObjectSchema, paramName: string, curLevel: number, flattenSimpleObject: boolean, flattenConfig: FlattenConfig): void {
        if (NodeHelper.HasSubClass(baseSchema)) {
            const isPolyAsResource: boolean = this.isPolyAsResource(baseSchema, paramName, flattenConfig);
            for (const subClass of NodeHelper.getSubClasses(baseSchema, true)) {
                if (this.canSubclassSimplified(subClass, flattenConfig, isPolyAsResource)) {
                    const config = cloneFlattenConfig(flattenConfig);
                    config.maxLevel = Math.max(32, config.maxLevel);
                    Helper.logDebug(this.session, `Try to flatten poly schema ${subClass.language.default.name} from ${baseSchema.language.default.name} with paramName ${paramName}, polyAsResource=${isPolyAsResource}`);
                    this.flattenSchemaFromPayload(subClass, curLevel, flattenSimpleObject || (!isPolyAsResource), config);
                }
            }
        }
    }

    private flattenSchemaFromPayload(schema: Schema, curLevel: number, flattenSimpleObject: boolean, flattenConfig: FlattenConfig) {

        if (!Helper.isObjectSchema(schema))
            return;
        if (curLevel >= flattenConfig.maxLevel) {
            const indicator = NodeCliHelper.getSimplifyIndicator(schema as ObjectSchema);
            // Continue flatten if there is only one property even when we hit the max level
            if (indicator.simplifiable !== true || indicator.propertyCountIfSimplify !== 1)
                return;
            Helper.logDebug(this.session, `continue flatten ${schema.language.default.name} when maxLevel is met because it's simplifiyIndicator.propertyCountIfSimplify is ${indicator.propertyCountIfSimplify}`);
        }

        for (const prop of getAllProperties(schema as ObjectSchema)) {
            if (prop.readOnly)
                continue;
            if (Helper.isObjectSchema(prop.schema)) {
                if (NodeHelper.HasSubClass(prop.schema as ObjectSchema)) {
                    this.flattenPolySchema(prop.schema as ObjectSchema, NodeCliHelper.getCliKey(prop, "noParamCliKey"), curLevel, flattenSimpleObject, flattenConfig);
                }
                else if (NodeCliHelper.getInCircle(prop.schema as ObjectSchema) !== true) {
                    if (flattenSimpleObject ||
                        NodeCliHelper.getComplexity(prop.schema) !== CliCommonSchema.CodeModel.Complexity.object_simple ||
                        NodeCliHelper.getSimplifyIndicator(prop.schema as ObjectSchema).propertyCountIfSimplify == 1) {
                        NodeCliHelper.setCliFlatten(prop, true);
                    }
                }
            }
            else if (Helper.isArraySchema(prop.schema)) {
                if (this.canArrayObjectSimplified((<ArraySchema>prop.schema).elementType, flattenConfig.maxArrayPropCount)) {
                    // put 32 as max flatten level for array object flatten here just in case, 
                    // it should be big enough value for array object flattening, but handle unexpected circle
                    // situation though it's not expected
                    const config = cloneFlattenConfig(flattenConfig);
                    config.maxLevel = Math.max(32, config.maxLevel);
                    this.flattenSchemaFromPayload((<ArraySchema>prop.schema).elementType, curLevel, flattenSimpleObject, config);
                }
            }
            this.flattenSchemaFromPayload(prop.schema, curLevel + 1, flattenSimpleObject, flattenConfig);
        }
    }

    private flattenPayload(param: Parameter, flattenConfig: FlattenConfig): void {
        if (!Helper.isObjectSchema(param.schema))
            return;
        if (NodeHelper.HasSubClass(param.schema as ObjectSchema)) {
            this.flattenPolySchema(param.schema as ObjectSchema, NodeCliHelper.getCliKey(param, "noParamCliKey"), 0, true, flattenConfig);
        }
        else {
            const r = this.calcPayloadFlatten(param.schema, flattenConfig);
            if (r > 0) {
                NodeCliHelper.setCliFlatten(param, true);
                const config = cloneFlattenConfig(flattenConfig);
                config.maxLevel = r;
                this.flattenSchemaFromPayload(param.schema, 0, false, config);
            }
        }
    }

    public async process(): Promise<CodeModel> {

        const overwriteSwagger = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_OVERWRITE_SWAGGER_KEY, false);
        const flattenAll = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_KEY, false);

        const flattenSchema = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_SCHEMA_KEY, false);

        // by default on when the flatten_all flag is one
        if (flattenSchema === true || flattenAll === true) {
            this.codeModel.schemas.objects?.forEach(o => {
                if (!NodeHelper.HasSubClass(o)) {
                    for (const p of getAllProperties(o)) {
                        if (isObjectSchema(p.schema)) {
                            NodeCliHelper.setCliFlatten(p, !NodeHelper.HasSubClass(p.schema as ObjectSchema));
                        }
                    }
                }
            });
        }

        const maxPropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_PROP_KEY, 32);
        const maxLevel = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_LEVEL_KEY, 5);
        const maxComplexity = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_COMPLEXITY_KEY, 1);
        const maxArrayPropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_ARRAY_OBJECT_PROP_KEY, 8);
        const maxPolyAsResourcePropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_POLY_AS_RESOURCE_PROP_KEY, 8);
        const maxPolyAsParamPropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_POLY_AS_PARAM_PROP_KEY, 8);
        const flattenPayload = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_KEY, false);

        const cliDirectives = await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);
        this.manager = new CliDirectiveManager();
        await this.manager.LoadDirective(
            cliDirectives.filter((d: CliCommonSchema.CliDirective.Directive) => (!isNullOrUndefined(d[NodeCliHelper.POLY_RESOURCE]) && d[NodeCliHelper.POLY_RESOURCE] === true))
                .map((d: CliCommonSchema.CliDirective.Directive) => {
                    const r: CliCommonSchema.CliDirective.Directive = {
                        select: d.select,
                        where: JSON.parse(JSON.stringify(d.where)),
                        hitCount: true,
                    };
                    r[NodeCliHelper.POLY_RESOURCE] = d[NodeCliHelper.POLY_RESOURCE];
                    return r;
                }));

        const flattenConfig: FlattenConfig = {
            maxComplexity: maxComplexity,
            maxLevel: maxLevel,
            maxPropCount: maxPropCount,
            maxArrayPropCount: maxArrayPropCount,
            maxPolyAsParamPropCount: maxPolyAsParamPropCount,
            maxPolyAsResourcePropCount: maxPolyAsResourcePropCount,
            overwriteSwagger: overwriteSwagger,
            nodeDescripter: null,
        };

        if (flattenPayload === true || flattenAll === true) {
            this.codeModel.operationGroups?.forEach(group => {
                group.operations.forEach(operation => {
                    values(operation.parameters)
                        .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
                        .forEach((p) => {
                            if (Helper.isObjectSchema(p.schema)) {
                                Helper.logDebug(this.session, `Try to set flatten for ${group.language.default.name}/${operation.language.default.name}/${p.language.default.name}`);

                                flattenConfig.nodeDescripter = {
                                    operationGroupCliKey: NodeCliHelper.getCliKey(group, "<noGroupCliKey>"),
                                    operationCliKey: NodeCliHelper.getCliKey(operation, "<noOpCliKey>"),
                                    parameterCliKey: NodeCliHelper.getCliKey(p, "noParamCliKey"),
                                    target: p,
                                    targetIndex: -1,
                                    parent: operation.parameters
                                };
                                this.flattenPayload(p, flattenConfig);
                            }
                        });

                    operation.requests.forEach((request, index) => {
                        if (!isNullOrUndefined(request.parameters)) {
                            values(request.parameters)
                                .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
                                .forEach(p => {
                                    if (Helper.isObjectSchema(p.schema)) {
                                        Helper.logDebug(this.session, `Try to set flatten for ${group.language.default.name}/${operation.language.default.name}/${p.language.default.name}`);

                                        flattenConfig.nodeDescripter = {
                                            operationGroupCliKey: NodeCliHelper.getCliKey(group, "<noGroupCliKey>"),
                                            operationCliKey: NodeCliHelper.getCliKey(operation, "<noOpCliKey>"),
                                            parameterCliKey: NodeCliHelper.getCliKey(p, "noParamCliKey"),
                                            requestIndex: index,
                                            target: p,
                                            targetIndex: -1,
                                            parent: operation.parameters
                                        };
                                        this.flattenPayload(p, flattenConfig);
                                    }
                                });
                        }
                    });

                });
            });
        }

        return this.codeModel;
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);

    const flag = await session.getValue(CliConst.CLI_FLATTEN_SET_ENABLED_KEY, false);
    if (flag !== true) {
        Helper.logWarning(session, `'${CliConst.CLI_FLATTEN_SET_ENABLED_KEY}' is not set to true, skip flattenSetter`);
    }
    else {
        dumper.dumpCodeModel("flatten-set-pre", session.model);

        const plugin = new FlattenSetter(session);
        await plugin.process();

        dumper.dumpCodeModel("flatten-set-post", session.model);

        let directives = await session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, []);
        const cliDirectives = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);
        directives = directives.concat(
            cliDirectives.filter((d: CliCommonSchema.CliDirective.Directive) => (!isNullOrUndefined(d.json) || !isNullOrUndefined(d.flatten)))
                .map((d: CliCommonSchema.CliDirective.Directive) => {
                    const r: CliCommonSchema.CliDirective.Directive = {
                        select: d.select,
                        where: JSON.parse(JSON.stringify(d.where)),
                        json: d.json,
                        flatten: d.flatten
                    };
                    return r;
                })
        );

        if (!isNullOrUndefined(directives) && isArray(directives) && directives.length > 0) {
            const modifier = await new Modifier(session).init(directives);
            modifier.process();
            dumper.dumpCodeModel("flatten-modifier-post", session.model);
        }

    }
    const finalMapping = new FlattenValidator(session).validate(session.model.schemas.objects);
    dumper.dump('clicommon-flatten-object-map.txt', finalMapping, true /*debug only*/);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}