# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "~4.1.60"

try-require: ./readme.cli.md

pipeline-model: v3
#clicommon: true
pipeline:
    clicommon:
        input: modelerfour
        output-artifact: source-file-common
        scope: clicommon

    clicommon/emitter:
        input: clicommon
        scope: here

scope-here:
    is-object: false
    output-artifact:
        - source-file-common
```
