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
       cli-flatten-set-enabled: true
       cli-flatten-all: true
       cli-flatten-payload: true
       cli-flatten-schema: false
       cli-flatten-all-overwrite-swagger: false
       cli-flatten-directive:
           - where:
               type: SchemaType
               prop: propertyName
             flatten: true
       # max properties allowed from flatten
       cli-flatten-payload-max-prop: 32
       # max complexity allowed from flatten
       #   a required json argument counted as 1
       #   an optional json argument counted as 0.5
       cli-flatten-payload-max-complexity: 1
       # max depth of flatten
       cli-flatten-payload-max-level: 5
       # max properties allowed from flatten of object in array to avoid json
       cli-flatten-payload-max-array-object-prop-count: 8
       # max properties allowed from flatten of sub-class as resource
       cli-flatten-payload-max-poly-as-resource-prop-count: 8
       # max properties allowed from flatten of sub-class as param
       cli-flatten-payload-max-poly-as-param-prop-count: 8

```
