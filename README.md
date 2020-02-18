# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "4.6.200"

pipeline-model: v3

modelerfour:
    group-parameters: true
    flatten-models: true
    flatten-payloads: true
    # standardize to snake in modelerfour for selecting and formatting in clicommon
    # further naming will be done in clicommon to corresonding convention
    naming: 
        parameter: 'snake'
        operation: 'snake'
        operationGroup:  'snake'

pipeline:
    clicommon:
        input: modelerfour/identity
        output-artifact: clicommon-output-file

    clicommon/emitter:
        input: clicommon
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - clicommon-output-file
```
