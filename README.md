# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "~4.1.60"

try-require: ./readme.cli.md

pipeline-model: v3

modelerfour:
    group-parameters: true
    flatten-models: true
    flatten-payloads: true
#clicommon: true
pipeline:
    clicommon:
        input: modelerfour
        output-artifact: source-file-common

    clicommon/emitter:
        input: 
            - clicommon
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - source-file-common
```
