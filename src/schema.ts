import { ChoiceValue, Metadata } from "@azure-tools/codemodel";

export type NamingStyle = 'camel' | 'pascal' | 'snake' | 'upper' | 'kebab' | 'space';
export type NamingType = 'parameter' | 'operation' | 'operationGroup' | 'property' | 'type' | 'choice' | 'choiceValue' | 'constant' | 'client';
export type M4NodeType = 'operationGroup' | 'operation' | 'parameter' | 'objectSchema' | 'property' | 'choiceSchema' | 'choiceValue' | 'exampleName' | 'examplePath';
export type LanguageType = 'cli' | 'default';
export type M4Node = Metadata | ChoiceValue;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CliConst {
    // Todo: merge this into code model?
    export const CLI_FORMATTABLE = "formatTable";
    export const CLI_FORMATTABLE_PROPERTIES = "properties";
    export const CLI_DIRECTIVE = "cli-directive";
    export const CLI_DIRECTIVE_KEY = 'cli.cli-directive';

    export const CLI_FLATTEN_DIRECTIVE_KEY = "cli.flatten.cli-flatten-directive";
    export const CLI_FLATTEN_SET_ENABLED_KEY = 'cli.flatten.cli-flatten-set-enabled';
    export const CLI_FLATTEN_SET_FLATTEN_ALL_KEY = 'cli.flatten.cli-flatten-all';
    export const CLI_FLATTEN_SET_FLATTEN_SCHEMA_KEY = 'cli.flatten.cli-flatten-schema';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_KEY = 'cli.flatten.cli-flatten-payload';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_PROP_KEY = 'cli.flatten.cli-flatten-payload-max-prop';
    export const CLI_FLATTEN_SET_M4FLATTEN_PAYLOAD_MAX_PROP_KEY = 'cli.flatten.cli-m4flatten-payload-max-prop';
    export const CLI_FLATTEN_SET_M4FLATTEN_PAYLOAD_TRACK1_ENABLED_KEY = 'cli.flatten.cli-m4flatten-payload-track1-enabled';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_COMPLEXITY_KEY = 'cli.flatten.cli-flatten-payload-max-complexity';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_LEVEL_KEY = 'cli.flatten.cli-flatten-payload-max-level';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_ARRAY_OBJECT_PROP_KEY = 'cli.flatten.cli-flatten-payload-max-array-object-prop-count';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_POLY_AS_RESOURCE_PROP_KEY = 'cli.flatten.cli-flatten-payload-max-poly-as-resource-prop-count';
    export const CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_POLY_AS_PARAM_PROP_KEY = 'cli.flatten.cli-flatten-payload-max-poly-as-param-prop-count';
    export const CLI_FLATTEN_SET_FLATTEN_ALL_OVERWRITE_SWAGGER_KEY = 'cli.flatten.cli-flatten-all-overwrite-swagger';
    export const CLI_FLATTEN_SET_FLATTEN_KEEP_UNUSED_FLATTENED_MODELS_KEY = 'cli.flatten.cli-flatten-keep-unused-flattened-models';
    export const CLI_FLATTEN_SET_FLATTEN_MULTIPLE_REQUEST_PARAMETER_FLATTENING_KEY = 'cli.flatten.cli-flatten-multiple-request-parameter-flattening';

    export const CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY = 'cli.polymorphism.expand-as-resource';

    export const CLI_SPLIT_OPERATION_ENABLED_KEY = 'cli.split-operation.cli-split-operation-enabled';
    export const CLI_SPLIT_OPERATION_EXTEND_POLY_RESOURCE_KEY = 'cli.split-operation.cli-split-operation-extend-poly-resource';

    export const DEFAULT_OPERATION_PARAMETER_INDEX = -1;

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
    }

    export class NamingType {
        static readonly parameter = 'parameter';
        static readonly operation = 'operation';
        static readonly operationGroup = 'operationGroup';
        static readonly property = 'property';
        static readonly type = 'type';
        static readonly choice = 'choice';
        static readonly choiceValue = 'choiceValue';
        static readonly constant = 'constant';
        static readonly client = 'client';
    }

    export class SelectType {
        static readonly operationGroup = 'operationGroup';
        static readonly operation = 'operation';
        static readonly parameter = 'parameter';
        static readonly objectSchema = 'objectSchema';
        static readonly property = 'property';
        static readonly choiceSchema = 'choiceSchema';
        static readonly choiceValue = 'choiceValue';
        static readonly exampleName = 'exampleName';
        static readonly examplePath = 'examplePath';
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CliCommonSchema {

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace CliDirective {

        export interface LogClause {
            position?: 'pre' | 'post' | 'both';
            message?: string;
            logLevel?: string;
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        export interface SetClause {
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-interface
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
            requestIndex?: number;
            parameter?: string;
            objectSchema?: string;
            property?: string;
            choiceSchema?: string;
            choiceValue?: string;
            exampleName?: string;
            examplePath?: string;
        }

        export interface FormatTableClause {
            properties?: string[];
        }

        export interface Directive {
            select?: M4NodeType;
            where?: WhereClause;
            set?: SetClause;
            hidden?: ValueClause;
            removed?: ValueClause;
            required?: ValueClause;
            json?: ValueClause;
            flatten?: ValueClause;
            "poly-resource"?: ValueClause;
            hitCount?: ValueClause;
            name?: ValueClause;
            description?: ValueClause;
            "default-value"?: ValueClause;
            /** in kebab-case */
            setName?: SetNameClause;
            replace?: ReplaceClause;
            formatTable?: FormatTableClause;
            "split-operation-names"?: ValueClause;
            "pre-json"?: ValueClause;
        }
    }

    export interface NamingConvention {
        appliedTo?: string[]
        singularize?: NamingType[]
        glossary?: string[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        override?: any
        parameter?: NamingStyle
        operation?: NamingStyle
        operationGroup?: NamingStyle
        property?: NamingStyle
        type?: NamingStyle
        choice?: NamingStyle
        choiceValue?: NamingStyle
    }

    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace CodeModel {
        export enum NodeTypeFlag {
            operationGroup = 1,
            operation = 2,
            parameter = 4, 
            objectSchema = 8,
            property = 16,
            choiceSchema = 32,
            choiceValue = 64,
            exampleName = 128,
        }

        export enum Complexity {
            unknown = 'unknown',
            /** normal type like int, string, boolean... */
            simple = 'simple',
            /** object that only contains 'simple', 'simple array' properties */
            object_simple = 'object_simple',
            /** object that's not object_simple  */
            object_complex = 'object_complex',
            /** array of 'simple' */
            array_simple = 'array_simple',
            /** array of non-simple */
            array_complex = 'array_complex',
            /** dictionary of simple */
            dictionary_simple = 'dictionary_simple',
            /** dictionary of non-simple */
            dictionary_complex = 'dictionary_complex'
        }

        export enum Visibility {
            unknown = "unknown",
            unknownInCircle = "unknownInCircle",
            false = "false",
            true = "true",
        }

        export interface SimplifyIndicator {
            simplifiable: boolean;
            propertyCountIfSimplify: number;
            propertyCountIfSimplifyWithoutSimpleObject: number
        }

        export interface NodeDescriptor {
            operationGroupCliKey?: string;
            operationCliKey?: string;
            requestIndex?: number;
            parameterCliKey?: string;
            objectSchemaCliKey?: string;
            propertyCliKey?: string;
            choiceSchemaCliKey?: string;
            choiceValueCliKey?: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parent: any;
            target: M4Node;
            /** set to -1 if the parent is not an array */
            targetIndex: number;
            /** Node path after the code model emit from modeler four
             *  The path is like json path. But in selector case, we use cliKey
             * 
             *  For example: schemas$$objects['OperationsList']$$properties['nextLink']
             * 
             *  It refer's to the element in code model
             *  schemas:
             *    objects:
             *      - &ref_xx: 
             *        cliKey: OperationsList
             *        properties:
             *          - &ref_xxx:
             *            cliKey: nextLink
             **/
            nodePath?: string;
            exampleName?: string;
            examplePath?: string;
        }
    }
}
