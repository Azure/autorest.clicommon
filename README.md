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
        output-artifact: source-file-clicommon
        #scope: clicommon

    #clicommon/clinamer:
    #    input: clicommon
        #output-artifact: source-file-commonnamer

    #clicommon/climodifiers:
    #    input: clinamer
    #    output-artifact: source-file-commonmodifiers

    clicommon/emitter:
        input: 
            - clicommon
            #- clinamer
            #- climodifiers
        scope: scope-clicommon

scope-clicommon:
    is-object: false
    output-artifact:
        - source-file-clicommon
        #- source-file-commonnamer
        #- source-file-commonmodifiers
```
