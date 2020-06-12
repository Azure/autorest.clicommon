# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "4.13.351"

pipeline-model: v3

pipeline:

    clicommon/cli-prenamer:
        input: modelerfour
        output-artifact: clicommon-prenamer

    clicommon/cli-split-operation:
        input: clicommon/cli-prenamer
        output-artifact: clicommon-split-operation

    clicommon/pre/cli-complex-marker:
        input: clicommon/cli-split-operation
        output-artifact: clicommon-complex-marker-pre

    clicommon/cli-flatten-setter:
        input: clicommon/pre/cli-complex-marker
        output-artifact: clicommon-flatten-setter
        
    modelerfour/new-transform:
        input: clicommon/cli-flatten-setter

    clicommon/cli-modeler-post-processor:
        input: modelerfour/identity
        output-artifact: clicommon-modeler-post-processor

    clicommon/cli-poly-as-resource-modifier:
        input: clicommon/cli-modeler-post-processor
        output-artifact: clicommon-poly-as-resource-modifier

    clicommon/cli-flatten-modifier:
        input: clicommon/cli-poly-as-resource-modifier
        output-artifact: clicommon-flatten-modifier

    clicommon:
        input: clicommon/cli-flatten-modifier
        output-artifact: clicommon-output

    clicommon/cli-complex-marker:
        input: clicommon
        output-artifact: clicommon-complex-marker
    
    #clicommon/cli-poly-as-param-modifier:
    #    input: clicommon/cli-complex-marker
    #    output-artifact: clicommon-poly-as-param-modifier

    clicommon/cli-visibility-cleaner:
        input: clicommon/cli-complex-marker
        output-artifact: clicommon-visibility-cleaner

    clicommon/identity:
        input: clicommon/cli-visibility-cleaner

    clicommon/emitter:
        input: 
          - clicommon
          - clicommon/cli-prenamer
          - clicommon/cli-split-operation
          - clicommon/cli-flatten-setter
          - clicommon/cli-modeler-post-processor
          #- clicommon/cli-poly-as-param-modifier
          - clicommon/cli-poly-as-resource-modifier
          - clicommon/cli-flatten-modifier
          - clicommon/cli-complex-marker
          - clicommon/pre/cli-complex-marker
          - clicommon/cli-visibility-cleaner
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - clicommon-output
        - clicommon-prenamer
        - clicommon-split-operation
        - clicommon-flatten-setter
        - clicommon-modeler-post-processor
        - clicommon-poly-as-resource-modifier
        - clicommon-flatten-modifier
        #- clicommon-poly-as-param-modifier
        - clicommon-complex-marker
        - clicommon-complex-marker-pre
        - clicommon-visibility-cleaner

modelerfour:
    # group-parameters: true
    # flatten-models: true
    # flatten-payloads: true    
    # lenient-model-deduplication: true

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
    # flatten:
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
    #    # max properties allowed from flatten
    #    cli-flatten-payload-max-prop: 32
    #    # max complexity allowed from flatten
    #    #   a required json argument counted as 1
    #    #   an optional json argument counted as 0.5
    #    cli-flatten-payload-max-complexity: 1
    #    # max depth of flatten
    #    cli-flatten-payload-max-level: 5
    #    # max properties allowed from flatten of object in array to avoid json
    #    cli-flatten-payload-max-array-object-prop-count: 8
    #    # max properties allowed from flatten of sub-class as resource
    #    cli-flatten-payload-max-poly-as-resource-prop-count: 8
    #    # max properties allowed from flatten of sub-class as param
    #    cli-flatten-payload-max-poly-as-param-prop-count: 8

    # example for split-operation
    # cli-directive:
    #     - where:
    #         group: OperationGroupName
    #         op: CreateOrUpdate
    #       split-operation-names:
    #         - Create
    #         - Update

    split-operation:
        # if true, operation with 'split-operation-names' will be splited into multiple 
        # operations with given names. 
        # Notice: 
        # 1. Splitted operation's key is in formate: <OriginalOperationName>#<SplitName>. 
        #    For example, in above case, the splitted operation keys are 'CreateOrUpdate#Create'
        #    and 'CreateOrUpdate#Update'. To make direcitve works on splitted operation, please 
        #    use the new key.
        # 2. If operation with split name has already existed in operation group, you will get 
        #    a warning and this split name will be skipped.
        cli-split-operation-enabled: true
    polymorphism:
        # if true, polymorphism parameter with 'poly-resource' marked as true will be
        # expanded into multiple operations for each subclasses
        expand-as-resource: true
    # add hidden=true to all the parameters whose properties are all hidden or constant
    auto-parameter-hidden: false
    naming:
        cli:
            appliedTo:
              - name
              - alias
              - cli-discriminator-value
            singularize:
              - operationGroup
              - operation
            override:
                cmyk : CMYK
                $host: $host
                LRO: LRO
                rp: RP
                db: DB
                adls: ADLS
                dw: DW
                ti: TI
                MCAS: MCAS
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
                db: DB
                adls: ADLS
                dw: DW
                ti: TI
                MCAS: MCAS
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
