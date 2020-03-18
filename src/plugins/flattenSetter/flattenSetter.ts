import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { DESTRUCTION } from "dns";
import { Helper } from "../../helper";
import { NodeHelper } from "../../nodeHelper"
import { CliConst, CliCommonSchema } from "../../schema";
import { CliDirectiveManager } from "../modifier/cliDirective";
import { Modifier } from "../modifier/modifier";
import { FlattenValidator } from "./flattenValidator";
import { values } from "@azure-tools/linq";

export class FlattenSetter {
    codeModel: CodeModel;
    cliConfig: any;
    manager: CliDirectiveManager;

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async process(host: Host) {

        let overwriteSwagger = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_OVERWRITE_SWAGGER_KEY, false);
        let flattenAll = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_KEY, false);

        let flattenSchema = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_SCHEMA_KEY, false);

        // by default on when the flatten_all flag is one
        if (flattenSchema === true || flattenAll === true) {
            this.codeModel.schemas.objects.forEach(o => {
                if (!NodeHelper.isBaseClass(o)) {
                    if (!isNullOrUndefined(o.properties)) {
                        o.properties.forEach(p => {
                            if (isObjectSchema(p.schema)) {
	                            NodeHelper.setFlatten(p, !NodeHelper.isBaseClass(p.schema as ObjectSchema), overwriteSwagger);
                            }
                        })
                    }
                }
            });
        }

        let flattenPayload = await this.session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_KEY, false);
        if (flattenPayload === true || flattenAll === true) {
            this.codeModel.operationGroups.forEach(group => {
                group.operations.forEach(operation => {
	                values(operation.parameters)
	                    .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
	                    .forEach(p => NodeHelper.setFlatten(p, !NodeHelper.isBaseClass(p.schema as ObjectSchema), overwriteSwagger));

	                operation.requests.forEach(request => {
	                    if (!isNullOrUndefined(request.parameters)) {
	                        values(request.parameters)
	                            .where(p => p.protocol.http?.in === 'body' && p.implementation === 'Method')
	                            .forEach(p => NodeHelper.setFlatten(p, !NodeHelper.isBaseClass(p.schema as ObjectSchema), overwriteSwagger));
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