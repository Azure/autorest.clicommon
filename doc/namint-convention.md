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
