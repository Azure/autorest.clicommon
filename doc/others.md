## Other configurations

``` yaml
cli:
    polymorphism:
        # if true, polymorphism parameter with 'poly-resource' marked as true will be
        # expanded into multiple operations for each subclasses
        expand-as-resource: true
    # add hidden=true to all the parameters whose properties are all hidden or constant
    auto-parameter-hidden: false
```