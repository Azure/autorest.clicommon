# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "4.10.250"

pipeline-model: v3

pipeline:

    modelerfour/new-transform:
        input: clicommon/cli-flatten-setter
	
#    clicommon/cli-config-twitter:
#        input: modelerfour 

    clicommon/cli-prenamer:
        input: modelerfour
        output-artifact: clicommon-prenamer

    clicommon/cli-flatten-setter:
        input: clicommon/cli-prenamer
        output-artifact: clicommon-flatten-setter

    clicommon:
        input: modelerfour/identity
        output-artifact: clicommon-output

    clicommon/identity:
        input: clicommon

    clicommon/emitter:
        input: 
          - clicommon
          - clicommon/cli-prenamer
          - clicommon/cli-flatten-setter
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - clicommon-output
        - clicommon-prenamer
        - clicommon-flatten-setter

modelerfour:
    #group-parameters: true
    #flatten-models: true
    #flatten-payloads: true    

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
    #flatten:
    #    cli-flatten-set-enabled: true
    #    cli-flatten-all: true
    #    cli-flatten-payload: true
    #    cli-flatten-schema: false
    #    cli-flatten-all-overwrite-swagger: false
    #    cli-flatten-directive:
    #        - where:
    #            type: SchemaType
    #            prop: propertyName
    #          flatten: true
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
                rp: RP
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
                rp: RP
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

> **snake_naming_convention** is used as standardized naming convention in clicommon, 
> so please use snake naming convention for the new name you provided so that clicommon can 
> convert it properly according to your naming convention settings.

## Flatten support:

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
        # whether to overwrite the flag in swagger when cli-flatten-all is true
        cli-flatten-all-overwrite-swagger: false
        # whether to flatten the body parameters of peration
        cli-flatten-payload : true
        # whether to flatten the object schemas except has discriminator (base class)
        cli-flatten-schema: false
        # further customizatoin on flatten
        # refer to the where caluse in the directive section below fore more details
        # flatten: true|false to set selectedNode.extensions['x-ms-client-flatten'] = true|false 
        cli-flatten-directive:
            - where:
                type: ResourceProviderOperation
                prop: display
              flatten: true

```

## Naming Convention:

> Naming convention to be used in the output of clicommon.
> Please make sure **snake_naming_convention** is used for the name provided.
> Samples as below:

``` $(sample-cli-directive)
cli:
    naming:
        # the naming convention used for language.cli
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
        # the naming convention used for language.default
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

> so please make sure **snake_naming_convention** is used for 'name' and 'alias' clause in directive 
> so that the naming convention configured in clicommon can be applied correctly
> when generating the output

#### Supported clause in directive
- select: 
  - the target object type of directive
  - optional (then will be figured out automatically from where clause)
  - possible value: 'operationGroup' | 'operation' | 'parameter' | 'objectSchema' | 'property' | 'choiceSchema' | 'choiceValue'
- where: 
  - conditions to locate the object to apply directive
  - required
  - regex is supported in the value
  - possible search condition, refer to sample below for more detail usage:
    - search for operatoinGroup, operation or parameter
      - 'operationGroup' | 'group' | 'resource': 'operationGroupName'
      - 'operation' | 'op': 'operationName'
      - 'parameter' | 'param': 'parameterName'
    - search for schema or properties
      - 'schemaObject' | 'type' | 'object': 'schemaName'
      - 'property' | 'prop': 'propertyName'
    - search for enum or enumValue
      - 'choiceSchema' | 'enum': 'choiceName'
      - 'choiceValue' | 'value': 'choiceName'
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
  - add 'alias: ...' under 'language->cli'.  Please make sure **snake_naming_convention** is used
  - optional
- json:
  - add 'json: ...' under 'language->cli'.
  - add 'x-ms-client-flatten: false' under 'extensions' if 'json: true'
- flatten:
  - add 'x-ms-client-flatten: ..." under 'extensions'
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

#### How to troubleshooting
> Add --debug in your command line to have more intermedia output files for troubleshooting

#### Samples

``` $(sample-cli-directive)
cli:
    cli-directive:
    # directive on operationGroup
      - select: 'operationGroup'
        where:
            operationGroup: 'OldName'
        name: 'new_name'   
      - where:
            resource: 'OldName'
        hidden: true
      - where:
            group: 'OldName'
        removed: 'true
    # add hidden property for operation
      - where:
            group: 'GroupName'
            operation: 'OperationName'
        hidden: true
      - where:
            group: 'groupName'
            op: 'OperationName'
        hidden: true
    # add removed property for parameter
      - where:
            group: 'groupName'
            op: 'OperationName'
            parameter: 'ParameterName'
        removed: true
      - where:
            group: 'groupName'
            op: 'OperationName'
            param: 'ParameterName'
        required: true
    # add hidden property for all parameter start with 'abc'
      - where:
            parameter: '^abc.*$'
        hidden: true
    # set table format under for schema
      - where:
            schemaObject: 'SchemaName'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
      - where:
            type: 'SchemaName'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
      - where:
            object: 'SchemaName'
        tableFormat:
            properties:
              - 'p1'
              - 'p2'
    # set anything for schema property
      - where:
            type: 'SchemaName'
            property: 'PropertyName'
        set:
            key1: 'value1'
            key2: true
            key3:
              - v1
              - v2
      - where:
            type: 'SchemaName'
            prop: 'PropertyName'
        set:
            key1: 'value1'
            key2: true
            key3:
              - v1
              - v2
    # replac 'name_a' with 'name_b' (whole word match) in operation's name
      - where:
            group: 'GroupName'
            op: 'OperationName'
        replace:
            field: 'name'
            old: 'name_a'
            new: 'name_b'
            isRegex: false
    # replace with regex
      - where:
            group: 'GroupName'
            op: 'OperationName'
        replace:
            field: 'description'
            old: '(startByThis)(.*)'
            new: 'startByThat$2'
            isRegex: true
    # add alias for enum value
      - where:
            choiceSchema: 'choiceType'
            choiceValue: 'choiceValue'
        alias: NewAlias
      - where:
            enum: 'enumTyp'
            value: 'enumValue'
        alias: NewAlias
```

