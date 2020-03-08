# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "4.6.200"

pipeline-model: v3

pipeline:

    modelerfour/new-transform:
        input: clicommon/flatten-setter

    clicommon/flatten-setter:
        input: modelerfour
        output-artifact: clicommon-flatten-setter

    clicommon/flatten-setter/emitter:
        input: clicommon/flatten-setter
        scope: scope-clicommon-flatten-setter

    clicommon:
        input: modelerfour/identity
        output-artifact: clicommon-output-file

    clicommon/identity:
        input: clicommon

    clicommon/emitter:
        input: clicommon/identity
        scope: scope-clicommon

scope-clicommon-flatten-setter:
    is-object: false
    output-artifact:
        - clicommon-flatten-setter

scope-clicommon:
    is-object: false
    output-artifact:
        - clicommon-output-file

modelerfour:
    # standardize to snake in modelerfour for selecting and formatting in clicommon
    # further naming will be done in clicommon to corresonding convention
    naming: 
        parameter: 'snake'
        operation: 'snake'
        operationGroup:  'snake'
        property: 'snake'
        type:  'snake'
        choice:  'snake'
        choiceValue:  'snake'
        constant:  'snake'
        client: 'pascal'
        override:  # a key/value mapping of names to force to a certain value 
          cmyk : CMYK
          $host: $host
          LRO: LRO

cli:
    naming:
        cli:
            appliedTo:
              - name
              - alias
            singularize:
              - operationGroup
              - operation
            override:
                cmyk : CMYK
                $host: $host
                LRO: LRO
                # workaround for modelerfour issue
                # https://github.com/Azure/autorest.modelerfour/issues/195
                SubscriptionId: SubscriptionId
            parameter: 'camel'
            operation: 'pascal'
            operationGroup:  'pascal'
            property: 'camel'
            type:  'pascal'
            choice: 'pascal'
            choiceValue: 'pascal'
            constant: 'pascal'
        default:
            override:
                cmyk : CMYK
                $host: $host
                LRO: LRO
                # workaround for modelerfour issue
                SubscriptionId: SubscriptionId
            parameter: 'camel'
            operation: 'pascal'
            operationGroup:  'pascal'
            property: 'camel'
            type:  'pascal'
            choice: 'pascal'
            choiceValue: 'pascal'
            constant: 'pascal'
```

# Available Configurations for CLI Common:

> **snake_naming_convention** is used as standardized naming convention in cli common 
> to avoid confusing from different name convention when querying code model and set name.

## Flatten support:

Refer to sample below for the configurations for Flatten.

> Add '--debug' argument to get following output files for debugging: 
* cli-flatten-set-flatten-mapping.txt
  * contains detail information about how objects are flattened
* cli-flatten-set-before-everything-simplified.yaml
  * useful for you to figure out the name to use to auther the cli-flatten-directive
* cli-flatten-set-after-flatten-set-simplified.yaml
* cli-flatten-set-after-flatten-set.yaml
* cli-flatten-set-before-everything.yaml

Sample:
``` $(sample-cli-directive)
modelerfour:
    # clicommon flatten depends on modelerfour's flatten
    # so please make sure modelerfour's flatten is turned on
    group-parameters: true
    flatten-models: true
    flatten-payloads: true
cli:
    flatten:
        # turn all the flatten features on/off
        cli-flatten-set-enabled: true
        # set to true to set flatten flag for
        #   - all the object schemas except has discriminator (base class)
        #   - all the body parameters of operation
        cli-flatten-all: true
        # further customizatoin on flatten
        # refer to the where caluse in the directive section below fore more details
        # flatten: true|false to set selectedNode.extensions['x-ms-client-flatten'] = true|false 
        cli-flatten-directive:
            - where:
                type: ResourceProviderOperation
                prop: display
              flatten: false

```

## Naming Convention:

> Naming convention to be used in the output of clicommon.
> Please make sure **snake_naming_convention** is used if the name is changed through directive
> so that it will be converted to correct naming convention in the output. Samples as below:

``` $(sample-cli-directive)
cli:
    naming:
        cli:
            appliedTo:
              - name
              - alias
            singularize:
              - operationGroup
              - operation
            override:
                cmyk : CMYK
                $host: $host
                LRO: LRO
            glossary:
              - insights
            parameter: 'camel'
            operation: 'pascal'
            operationGroup:  'pascal'
            property: 'camel'
            type:  'pascal'
            choice: 'pascal'
            choiceValue: 'pascal'
        default:
            override:
                cmyk : CMYK
                $host: $host
                LRO: LRO
            parameter: 'camel'
            operation: 'pascal'
            operationGroup:  'pascal'
            property: 'camel'
            type:  'pascal'
            choice: 'pascal'
            choiceValue: 'pascal'
```



## Directive

> so please make sure **snake_naming_convention** is used for 'where' and 'name' clause in directive 
> so that the correct object can be located in code model and naming convention can be applied correctly
> when generating the output

#### Supported clause in directive
- select: 
  - the target object type of directive
  - optional (then will be figured out automatically from where clause)
  - possible value: 'operationGroup' | 'operation' | 'parameter' | 'objectSchema' | 'property' | 'choiceSchema' | 'choiceValue'
- where: 
  - conditions to locate the object to apply directive
  - required
  - **snake_naming_converion** is expected as the value
  - regex is supported in the value
  - possible search condition, refer to sample below for more detail usage:
    - search for operatoinGroup, operation or parameter
      - 'operationGroup' | 'group' | 'resource': 'name_in_snake_naming_convention'
      - 'operation' | 'op': 'name_in_snake_naming_convention'
      - 'parameter' | 'param': 'name_in_snake_naming_convention'
    - search for schema or properties
      - 'schemaObject' | 'type' | 'object': 'name_in_snake_naming_convention'
      - 'property' | 'prop': 'name_in_snake_naming_convention'
    - search for enum or enumValue
      - 'choiceSchema' | 'enum': 'name_in_snake_naming_convention'
      - 'choiceValue' | 'value': 'name_in_snake_naming_convention'
- set:
  - set anything property in the selected object(s)
  - optional
- name:
  - add 'name: ...' under 'language->cli'. Please make sure **snake_naming_convention** is used
  - optional
- hidden:
  - add 'hidden: ...' under 'language->cli'.
  - optional
- removed:
  - add 'removed: ...' under 'language->cli'.
  - optional
- required:
  - add 'required: ...' under 'language->cli'.
  - optional
- alias:
  - add 'alias: ...' under 'language->cli'
  - optional
- formatTable:
  - add properties information  under 'language->cli'.
  - optional
  - value format:
    - properties:
      - prop1Name
      - prop2Name
      - ...
- replace:
  - do replacement
  - optional
  - value format:
    - field: 'name'
    - old: 'old_value'
    - new: 'new_value'
    - isRegex: true | false

#### How to figure out the name to be used in directives
- Enable output for clicommon by following configuration:
``` #(sample-cli-directive)
     output-artifact:
        - clicommon-output-file
```
- File 'clicommon-name-mapping.yaml' will be generated containing the simplified code model which can be looked up for the name of operationGroup, operation, parameter, schema, property, enum, enumValue
- Additional output files for debugging purpose will be generated if --debug is set

#### Samples

``` $(sample-cli-directive)
cli:
    cli-directive:
    # directive on operationGroup
      - select: 'operationGroup'
        where:
            operationGroup: 'old_name'
        name: 'new_name'   
      - where:
            resource: 'old_name'
        hidden: true
      - where:
            group: 'old_name'
        removed: 'true
    # add hidden property for operation
      - where:
            group: 'group_name'
            operation: 'operation_name'
        hidden: true
      - where:
            group: 'group_name'
            op: 'operatoin_name'
        hidden: true
    # add removed property for parameter
      - where:
            group: 'group_name'
            op: 'operation_name'
            parameter: 'parameter_name'
        removed: true
      - where:
            group: 'group_name'
            op: 'operation_name'
            param: 'parameter_name'
        required: true
    # add hidden property for all parameter start with 'abc'
      - where:
            parameter: '^abc.*$'
        hidden: true
    # set table format under for schema
      - where:
            schemaObject: 'schema_name'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
      - where:
            type: 'schema_name'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
      - where:
            object: 'schema_name'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
    # set anything for schema property
      - where:
            type: 'schema_name'
            property: 'property_name'
        set:
            key1: 'value1'
            key2: true
            key3:
              - v1
              - v2
      - where:
            type: 'schema_name'
            prop: 'property_name'
        set:
            key1: 'value1'
            key2: true
            key3:
              - v1
              - v2
    # replac 'name_a' with 'name_b' (whole word match) in operation's name
      - where:
            group: 'group_name'
            op: 'operation_name'
        replace:
            field: 'name'
            old: 'name_a'
            new: 'name_b'
            isRegex: false
    # replace with regex
      - where:
            group: 'group_name'
            op: 'operation_name'
        replace:
            field: 'description'
            old: '(startByThis)(.*)'
            new: 'startByThat$2'
            isRegex: true
    # add alias for enum value
      - where:
            choiceSchema: 'choice_type'
            choiceValue: 'choice_value_name'
        alias: NewAlias
      - where:
            enum: 'enum_type'
            value: 'value_name'
        alias: NewAlias
```

