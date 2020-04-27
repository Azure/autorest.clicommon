# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "4.12.301"

pipeline-model: v3

pipeline:

    modelerfour/new-transform:
        input: clicommon/cli-flatten-setter
	
    clicommon/cli-prenamer:
        input: modelerfour
        output-artifact: clicommon-prenamer

    clicommon/pre/cli-complex-marker:
        input: clicommon/cli-prenamer
        output-artifact: clicommon-complex-marker-pre

    clicommon/cli-flatten-setter:
        input: clicommon/pre/cli-complex-marker
        output-artifact: clicommon-flatten-setter

    clicommon:
        input: modelerfour/identity
        output-artifact: clicommon-output

    clicommon/cli-poly-as-resource-modifier:
        input: clicommon
        output-artifact: clicommon-poly-as-resource-modifier

    clicommon/cli-complex-marker:
        input: clicommon/cli-poly-as-resource-modifier
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
          - clicommon/cli-flatten-setter
          #- clicommon/cli-poly-as-param-modifier
          - clicommon/cli-poly-as-resource-modifier
          - clicommon/cli-complex-marker
          - clicommon/pre/cli-complex-marker
          - clicommon/cli-visibility-cleaner
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - clicommon-output
        - clicommon-prenamer
        - clicommon-flatten-setter
        - clicommon-poly-as-resource-modifier
        #- clicommon-poly-as-param-modifier
        - clicommon-complex-marker
        - clicommon-complex-marker-pre
        - clicommon-visibility-cleaner

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



