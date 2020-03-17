import { Host, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";

export async function processRequest(host: Host) {
    const session = await Helper.init(host);

    let oriNaming : any = await session.getValue('modelerfour.naming');
    Helper.logDebug(JSON.stringify(oriNaming));
    oriNaming.property = 'snake';
    oriNaming.property = 'snake';
    oriNaming.operation = 'snake';
    oriNaming.operationGroup = 'snake';
    oriNaming.choice = 'snake';
    oriNaming.choiceValue = 'snake';
    oriNaming.constant = 'snake';
    oriNaming.type = 'snake';
    await session.setValue('modelerfour.naming', oriNaming);
    Helper.logDebug(JSON.stringify(oriNaming));

    Helper.outputToModelerfour();
}