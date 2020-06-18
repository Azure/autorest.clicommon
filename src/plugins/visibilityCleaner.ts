import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, ObjectSchema, isObjectSchema, Parameter, ArraySchema, DictionarySchema, ConstantSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { CliCommonSchema } from "../schema";
import { NodeHelper, NodeCliHelper } from "../nodeHelper";

class VisibilityCleaner {

    constructor(private session: Session<CodeModel>) {
    }

    private calcObject(schema: ObjectSchema): CliCommonSchema.CodeModel.Visibility {

        const visibleProperty = NodeCliHelper.getIsVisibleFlag(schema);
        if (visibleProperty) {
            if (visibleProperty === CliCommonSchema.CodeModel.Visibility.unknown) {
                // a circle found, lets go around it again to calculate the correct visibility
                NodeCliHelper.setIsVisibleFlag(schema, CliCommonSchema.CodeModel.Visibility.unknownInCircle);
            }
            else if (visibleProperty === CliCommonSchema.CodeModel.Visibility.unknownInCircle) {
                // it's the 3rd time we reach here, return isVisibility = false should be safe now
                return CliCommonSchema.CodeModel.Visibility.false;
            }
            else {
                return visibleProperty;
            }
        }

        let visible = CliCommonSchema.CodeModel.Visibility.false;

        if (schema.properties && schema.properties.length > 0) {
            for (const prop of schema.properties) {
                if (!NodeHelper.checkVisibility(prop))
                    continue;
                if (isObjectSchema(prop.schema)) {
                    if (this.calcObject(prop.schema) === CliCommonSchema.CodeModel.Visibility.true)
                        visible = CliCommonSchema.CodeModel.Visibility.true;
                }
                else if ((prop.schema instanceof ArraySchema || prop.schema instanceof DictionarySchema)) {
                    visible = CliCommonSchema.CodeModel.Visibility.true;
                }
                else if (prop.schema instanceof ConstantSchema) {
                    // do nothing here
                }
                else {
                    // can we set readonly/hidden/removed on simple type schema directly?
                    visible = CliCommonSchema.CodeModel.Visibility.true;
                }
            }
        }

        if (visible === CliCommonSchema.CodeModel.Visibility.false) {
            if (NodeHelper.HasSubClass(schema)) {
                for (const subClass of NodeHelper.getSubClasses(schema, true)) {
                    if (this.calcObject(subClass) === CliCommonSchema.CodeModel.Visibility.true) {
                        visible = CliCommonSchema.CodeModel.Visibility.true;
                        break;
                    }                    
                }
            }
        }

        NodeCliHelper.setIsVisibleFlag(schema, visible);
        return visible;
    }

    public process(): void {

        this.session.model.schemas.objects.forEach(obj => {
            this.calcObject(obj);
        });

        Helper.enumerateCodeModel(this.session.model, (descriptor) => {
            if (descriptor.target instanceof Parameter) {
                if (NodeCliHelper.getIsVisibleFlag(descriptor.target.schema) === CliCommonSchema.CodeModel.Visibility.false) {
                    NodeCliHelper.setHidden(descriptor.target, true);
                    NodeCliHelper.setIsVisibleFlag(descriptor.target, CliCommonSchema.CodeModel.Visibility.false);
                }
            }
        }, CliCommonSchema.CodeModel.NodeTypeFlag.parameter);

    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);

    const flag = await session.getValue('cli.auto-parameter-hidden', false);
    if (flag === true) {

        Helper.dumper.dumpCodeModel('visibility-cleaner-pre');

        const cm = new VisibilityCleaner(session);
        cm.process();

        Helper.dumper.dumpCodeModel('visibility-cleaner-post');
    }
    else {
        Helper.logWarning('cli.auto-parameter-hidden is not true, skip visibility cleaner');
    }

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}