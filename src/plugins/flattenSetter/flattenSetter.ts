import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, getAllProperties, Parameter, DictionarySchema, Schema, ArraySchema, ConstantSchema, AnySchema } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { DESTRUCTION } from "dns";
import { Helper } from "../../helper";
import { NodeHelper } from "../../nodeHelper"
import { CliConst, CliCommonSchema } from "../../schema";
import { CliDirectiveManager } from "../modifier/cliDirective";
import { Modifier } from "../modifier/modifier";
import { FlattenValidator } from "./flattenValidator";
import { values, Dictionary } from "@azure-tools/linq";
import { Z_DEFLATED } from "zlib";

class flattenInfo {
    public constructor(public propCount: number = 0, public complexity: number = 0) { }
};

export class FlattenSetter {
    codeModel: CodeModel;
    cliConfig: any;
    manager: CliDirectiveManager;

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    private canArrayObjectSimplified(schema: Schema, maxArrayObjProp: number) {
        if (schema instanceof ObjectSchema && !NodeHelper.HasSubClass(schema)) {
            let sim = NodeHelper.getSimplifyIndicator(schema);
            return ((!isNullOrUndefined(sim)) && sim.simplifiable === true && sim.propertyCountIfSimplify <= maxArrayObjProp);
        }
        return false;
    }

    /**
     * level N means this is the Nth flatten, 0 means no flatten done which means the top level
     * @param schema
     * @param info - should be pre-prepared
     * @param level
     */
    private calcSchemaForPayloadFlatten(schema: Schema, info: flattenInfo[], level: number, required: boolean, maxArrayObjProp: number): number {

        let weight = required ? 1 : 0.5;

        let increasePropCount = () => {
            for (let i = level; i < info.length; i++)
                info[i].propCount++;
        };

        let increaseComplexity = () => {
            for (let i = level; i < info.length; i++)
                info[i].complexity = +weight;
        };

        let r = level;

        if (schema instanceof ArraySchema) {
            increasePropCount();
            if (NodeHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.array_complex) {
                if (!this.canArrayObjectSimplified(schema, maxArrayObjProp))
                    increaseComplexity();
            }
        }
        else if (schema instanceof DictionarySchema) {
            increasePropCount();
            if (NodeHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.dictionary_complex)
                increaseComplexity();
        }
        else if (schema instanceof AnySchema) {
            increasePropCount();
            increaseComplexity();
        }
        else if (schema instanceof ConstantSchema) {
        }
        else if (schema instanceof ObjectSchema) {
            if (NodeHelper.HasSubClass(schema)) {
                increasePropCount();
                increaseComplexity();
            }
            else if (NodeHelper.getComplexity(schema) === CliCommonSchema.CodeModel.Complexity.object_simple) {
                increasePropCount();
            }
            else {
                info[level].propCount++;
                info[level].complexity += weight;
                for (let prop of getAllProperties(schema)) {
                    if (prop.readOnly)
                        continue;
                    if (level + 1 < info.length) {
                        r = this.calcSchemaForPayloadFlatten(prop.schema, info, level + 1, prop.required, maxArrayObjProp);
                    }
                }
            }
        }
        else {
            increasePropCount();
        }
        return r;
    }

    private calcPayloadFlatten(param: Parameter, maxLevel: number, maxPropCount: number, maxComplexity: number, maxArrayObjProp): number {
        let defaultLevel = 1;
        let info: flattenInfo[] = [];
        for (let i = maxLevel; i >= 0; i--)
            info.push(new flattenInfo());

        let r = this.calcSchemaForPayloadFlatten(param.schema, info, 0, true, maxArrayObjProp);

        for (let i = 0; i <= r; i++) {
            Helper.logDebug(`Level-${i}: propCount=${info[i].propCount}, complexity=${info[i].complexity}`)
        }

        for (let i = r; i >= 0; i--) {
            if (info[i].propCount <= maxPropCount && info[i].complexity <= maxComplexity) {
                if (i == 0 && NodeHelper.getComplexity(param.schema) === CliCommonSchema.CodeModel.Complexity.object_simple) {
                    Helper.logDebug(`flatten to level ${i} and adjusted to 1 for top level simple object with maxLevel=${maxLevel}, maxPropCount=${maxPropCount}, maxComplexity=${maxComplexity}`);
                    return 1;
                }
                else {
                    Helper.logDebug(`flatten to level ${i} with maxLevel=${maxLevel}, maxPropCount=${maxPropCount}, maxComplexity=${maxComplexity}`);
                    return i;
                }
            }
        }

        return defaultLevel;
    }

    private flattenSchemaFromPayload(schema: Schema, curLevel: number, maxLevel: number, overwritten: boolean, maxArrayObjProp: number) {

        if (curLevel >= maxLevel)
            return;
        if (!(schema instanceof ObjectSchema))
            return;

        for (let prop of getAllProperties(schema)) {
            if (prop.readOnly)
                continue;
            if (prop.schema instanceof ObjectSchema) {
                if (!NodeHelper.HasSubClass(prop.schema) &&
                    NodeHelper.getComplexity(prop.schema) !== CliCommonSchema.CodeModel.Complexity.object_simple &&
                    NodeHelper.getInCircle(prop.schema) !== true)
                    NodeHelper.setFlatten(prop, true, overwritten);
            }
            else if (prop.schema instanceof ArraySchema) {
                if (this.canArrayObjectSimplified(prop.schema.elementType, maxArrayObjProp)) {
                    // put 32 as max flatten level for array object flatten here just in case, 
                    // it should be big enough value for array object flattening, but handle unexpected circle
                    // situation though it's not expected
                    this.flattenSchemaFromPayload(prop.schema.elementType, curLevel, Math.max(32, maxLevel), false, maxArrayObjProp);
                }
            }
            this.flattenSchemaFromPayload(prop.schema, curLevel + 1, maxLevel, overwritten, maxArrayObjProp);
        }

    }

    private flattenPayload(param: Parameter, maxLevel: number, maxPropCount: number, maxComplexity: number, overwritten: boolean, maxArrayObjProp: number) {

        let r = this.calcPayloadFlatten(param, maxLevel, maxPropCount, maxComplexity, maxArrayObjProp);
        if (r > 0) {
            NodeHelper.setFlatten(param, true, overwritten);
            this.flattenSchemaFromPayload(param.schema, 1, r, overwritten, maxArrayObjProp);
        }
    }

    async process(host: Host) {

        let overwriteSwagger = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_OVERWRITE_SWAGGER_KEY, false);
        let flattenAll = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_KEY, false);

        let flattenSchema = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_SCHEMA_KEY, false);

        // by default on when the flatten_all flag is one
        if (flattenSchema === true || flattenAll === true) {
            this.codeModel.schemas.objects.forEach(o => {
                if (!NodeHelper.HasSubClass(o)) {
                    for (let p of getAllProperties(o)) {
                        if (isObjectSchema(p.schema)) {
                            NodeHelper.setFlatten(p, !NodeHelper.HasSubClass(p.schema as ObjectSchema), overwriteSwagger);
                        }
                    }
                }
            });
        }

        let maxPropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_PROP_KEY, 32);
        let maxLevel = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_LEVEL_KEY, 5);
        let maxComplexity = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_COMPLEXITY_KEY, 1);
        let maxArrayPropCount = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_ARRAY_OBJECT_PROP_KEY, 8);
        let flattenPayload = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_KEY, false);

        if (flattenPayload === true || flattenAll === true) {
            this.codeModel.operationGroups.forEach(group => {
                group.operations.forEach(operation => {
                    values(operation.parameters)
                        .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
                        .forEach(p => {
                            if (p.schema instanceof ObjectSchema && !NodeHelper.HasSubClass(p.schema)) {
                                Helper.logDebug(`Try to set flatten for ${group.language.default.name}/${operation.language.default.name}/${p.language.default.name}`);
                                this.flattenPayload(p, maxLevel, maxPropCount, maxComplexity, overwriteSwagger, maxArrayPropCount);
                            }
                        });

                    operation.requests.forEach(request => {
                        if (!isNullOrUndefined(request.parameters)) {
                            values(request.parameters)
                                .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
                                .forEach(p => {
                                    if (p.schema instanceof ObjectSchema && !NodeHelper.HasSubClass(p.schema)) {
                                        Helper.logDebug(`Try to set flatten for ${group.language.default.name}/${operation.language.default.name}/${p.language.default.name}`);
                                        this.flattenPayload(p, maxLevel, maxPropCount, maxComplexity, overwriteSwagger, maxArrayPropCount);
                                    }
                                });
                        }
                    });

                })
            })
        }

        return this.codeModel;
    }
}

export async function processRequest(host: Host) {
    let debugOutput = {};

    const session = await Helper.init(host);

    let flag = await session.getValue(CliConst.CLI_FLATTEN_SET_ENABLED_KEY, false);
    if (flag !== true) {
        Helper.logWarning(`'${CliConst.CLI_FLATTEN_SET_ENABLED_KEY}' is not set to true, skip flattenSetter`);
    }
    else {
        Helper.dumper.dumpCodeModel("flatten-set-pre");

        let m4FlattenModels = await session.getValue('modelerfour.flatten-models', false);
        if (m4FlattenModels !== true)
            Helper.logWarning('modelerfour.flatten-models is not turned on');
        let m4FlattenPayloads = await session.getValue('modelerfour.flatten-payloads', false);
        if (m4FlattenPayloads !== true)
            Helper.logWarning('modelerfour.flatten-payloads is not turned on');

        const plugin = await new FlattenSetter(session);
        let flatResult = await plugin.process(host);

        Helper.dumper.dumpCodeModel("flatten-set-post");

        let directives = await session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, []);
        let cliDirectives = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);
        directives = directives.concat(
            cliDirectives.filter((d: CliCommonSchema.CliDirective.Directive) => (!isNullOrUndefined(d.json) || !isNullOrUndefined(d.flatten)))
                .map((d: CliCommonSchema.CliDirective.Directive) => {
                    let r: CliCommonSchema.CliDirective.Directive = {
                        select: d.select,
                        where: JSON.parse(JSON.stringify(d.where)),
                        json: d.json,
                        flatten: d.flatten
                    };
                    return r;
                })
        )

        if (!isNullOrUndefined(directives) && isArray(directives) && directives.length > 0) {
            const modifier = await new Modifier(session).init(directives);
            let modResult: CodeModel = modifier.process();
            Helper.dumper.dumpCodeModel("flatten-modifier-post");
        }

    }
    let finalMapping = new FlattenValidator(session).validate(session.model.schemas.objects)
    Helper.dumper.dump('clicommon-flatten-object-map.txt', finalMapping, true /*debug only*/);

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}