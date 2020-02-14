import { Session, Message } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";

export class Logger {
    private constructor(private session: Session<CodeModel>) {
    }

    private static logger: Logger = null;

    public static get instance(): Logger{
        if (isNullOrUndefined(Logger.logger)) {
            throw Error("Please call Logger.Initialize() to initialize first");
        }
        return Logger.logger;
    }

    public static Initialize(session: Session<CodeModel>) {
        Logger.logger = new Logger(session);
    }

    public log(message: Message) {
        this.session.message(message);
    }

    public info(message: string, details?: any) {
        this.session.log(message, details);
    }

    public warning(message: string, details?: any) {
        this.session.warning(message, details);
    }

    public error(message: string, details?: any) {
        this.session.error(message, details);
    }

    public verbose(message: string, details?: any) {
        this.session.verbose(message, details);
    }

    public debug(message: string, details?: any) {
        this.session.debug(message, details);
    }
}