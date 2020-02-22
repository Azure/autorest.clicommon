import {
    Metadata, ChoiceValue,
} from "@azure-tools/codemodel";

export type NamingStyle = 'camel' | 'pascal' | 'snake' | 'upper' | 'kebab' | 'space';
export type M4NodeType = 'operationGroup' | 'operation' | 'parameter' | 'objectSchema' | 'property' | 'enumSchema' | 'enumValue';
export type LanguageType = 'cli' | 'default';
export type M4Node = Metadata | ChoiceValue;

export namespace CliConst {
    // Todo: merge this into code model?
    export const CLI: string = "cli";
    export const CLI_FORMATTABLE: string = "formatTable";
    export const CLI_FORMATTABLE_PROPERTIES: string = "properties";
    export const CLI_DIRECTIVE: string = "cli-directive";

    export class NamingStyle {
        /** camelCase */
        static readonly camel = "camel";
        /** PascalCase */
        static readonly pascal = "pascal";
        /** snake_case */
        static readonly snake = "snake";
        /** kebab-case */
        static readonly kebab = "kebab";
        /** space case */
        static readonly space = "space";
        /** UPPER_CASE */
        static readonly upper = "upper";
    };

    export class SelectType {
        static readonly operationGroup = 'operationGroup';
        static readonly operation = 'operation';
        static readonly parameter = 'parameter';
        static readonly objectSchema = 'objectSchema';
        static readonly property = 'property';
        static readonly enumSchema = 'enumSchema';
        static readonly enumValue = 'enumValue';
    }
}

export namespace CliCommonSchema {

    export namespace CliDirective {

        export interface LogClause {
            position?: 'pre' | 'post' | 'both';
            message?: string;
            logLevel?: string;
        }

        export interface SetClause {
        }

        export interface ValueClause {
        }

        export interface SetNameClause {
            /** name in kebab-case */
            name: string;
        }

        export interface ReplaceClause {
            field: string;
            isRegex?: boolean;
            old: string;
            new: string;
        }

        export interface WhereClause {
            operationGroup?: string;
            operation?: string;
            parameter?: string;
            objectSchema?: string;
            property?: string;
            enumSchema?: string;
            enumValue?: string;
        }

        export interface FormatTableClause {
            properties?: string[];
        }

        export interface Directive {
            select?: M4NodeType;
            where?: WhereClause;
            set?: SetClause;
            hide?: ValueClause;
            remove?: ValueClause;
            name?: ValueClause;
            /** in kebab-case */
            setName?: SetNameClause;
            log?: LogClause;
            replace?: ReplaceClause;
            formatTable?: FormatTableClause;
        }
    }

    export interface NamingConvention {
        singularize?: M4NodeType[]
        parameter?: NamingStyle
        operation?: NamingStyle
        operationGroup?: NamingStyle
        property?: NamingStyle
        type?: NamingStyle
        choice?: NamingStyle
        choiceValue?: NamingStyle
    }

    export namespace CodeModel {
        export interface NodeDescriptor {
            operationGroupName?: string;
            operationName?: string;
            parameterName?: string;
            objectSchemaName?: string;
            propertyName?: string;
            enumSchema?: string;
            enumValue?: string;
            target: M4Node;
        }
    }
}
