# configuration

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@autorest/modelerfour": "~4.1.60"

pipeline-model: v3
#clicommon: true
pipeline:
    cli.common:
        input: modelerfour
        output-artifact: source-file-common
        scope: clicommon

    cli.common/emitter:
        input: cli.common
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - source-file-common
```
