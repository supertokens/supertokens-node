import { SuperTokensPlugin, SuperTokensPublicConfig, SuperTokensPublicPlugin } from "../../lib/build/types";
import PluginTestRecipe from "./recipe";

export function functionOverrideFactory(identifier: string) {
    return function override(originalImplementation) {
        return {
            ...originalImplementation,
            signIn: function (message: string, stack: string[]) {
                return originalImplementation.signIn(message, [...stack, identifier]);
            },
        };
    };
}

export function apiOverrideFactory(identifier: string) {
    return function override(originalImplementation) {
        return {
            ...originalImplementation,
            signInPOST: function (message: string, stack: string[]) {
                return originalImplementation.signInPOST(message, [...stack, identifier]);
            },
        };
    };
}

export function configOverrideFactory(identifier: string) {
    return function override(originalConfig) {
        return {
            ...originalConfig,
            testProperty: [...(originalConfig.testProperty || []), identifier],
        };
    };
}

export function initFactory(identifier: string) {
    return function init(config: SuperTokensPublicConfig, pluginsAbove: SuperTokensPublicPlugin[], sdkVersion: string) {
        PluginTestRecipe.initCalls.push(identifier);
    };
}

export function dependencyFactory(dependencies?: SuperTokensPlugin[]) {
    if (dependencies === undefined) {
        dependencies = [];
    }

    return function dependency(
        config: SuperTokensPublicConfig,
        pluginsAbove: SuperTokensPublicPlugin[],
        sdkVersion: string
    ): { status: "OK"; pluginsToAdd?: SuperTokensPlugin[] } | { status: "ERROR"; message: string } {
        const addedPluginIds: string[] = pluginsAbove.map((p) => p.id);
        const pluginsToAdd: SuperTokensPlugin[] = dependencies!.filter((p) => !addedPluginIds.includes(p.id));
        return {
            status: "OK",
            pluginsToAdd,
        };
    };
}

export function pluginFactory({
    identifier,
    overrideFunctions = false,
    overrideApis = false,
    overrideConfig = false,
    dependencies,
    addInit = false,
}: {
    identifier: string;
    overrideFunctions: boolean;
    overrideApis: boolean;
    overrideConfig: boolean;
    dependencies?: SuperTokensPlugin[];
    addInit?: boolean;
}): SuperTokensPlugin {
    const overrideMap: Record<string, any> = {};

    if (overrideFunctions || overrideApis) {
        overrideMap[PluginTestRecipe.RECIPE_ID] = {};
    }

    if (overrideFunctions) {
        overrideMap[PluginTestRecipe.RECIPE_ID].functions = functionOverrideFactory(identifier);
    }

    if (overrideApis) {
        overrideMap[PluginTestRecipe.RECIPE_ID].apis = apiOverrideFactory(identifier);
    }

    if (overrideConfig) {
        overrideMap[PluginTestRecipe.RECIPE_ID].config = configOverrideFactory(identifier);
    }

    return {
        id: identifier,
        compatibleSDKVersions: ["23.0.x", ">23.0.1"],
        overrideMap,
        init: addInit ? initFactory(identifier) : undefined,
        dependencies: dependencyFactory(dependencies),
    };
}

export const Plugin1 = pluginFactory({
    identifier: "plugin1",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    addInit: true,
});
export const Plugin2 = pluginFactory({
    identifier: "plugin2",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    addInit: true,
});
export const Plugin3Dep1 = pluginFactory({
    identifier: "plugin3dep1",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    dependencies: [Plugin1],
    addInit: true,
});
export const Plugin3Dep2_1 = pluginFactory({
    identifier: "plugin3dep2_1",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    dependencies: [Plugin2, Plugin1],
    addInit: true,
});
export const Plugin4Dep1 = pluginFactory({
    identifier: "plugin4dep1",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    dependencies: [Plugin1],
    addInit: true,
});
export const Plugin4Dep2 = pluginFactory({
    identifier: "plugin4dep2",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    dependencies: [Plugin2],
    addInit: true,
});
export const Plugin4Dep3__2_1 = pluginFactory({
    identifier: "plugin4dep3__2_1",
    overrideFunctions: true,
    overrideApis: false,
    overrideConfig: true,
    dependencies: [Plugin3Dep2_1],
    addInit: true,
});
