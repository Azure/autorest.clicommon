export class DependencyModel {
    public operationGroup: string;
    public resourceName: string;
    public internalDependedResourcesSet: Set<string> = new Set();
    public internalDependedResources: string[] = [];
    public externalDependedResourcesSet: Set<string> = new Set();
    public externalDependedResources: string[] = [];

    public constructor(operationGroup: string, resourceName: string) {
        this.operationGroup = operationGroup;
        this.resourceName = resourceName;
    }
}