import OverrideableBuilder from "supertokens-js-override";
import { SuperTokensConfig, SuperTokensPlugin, SuperTokensPublicPlugin } from ".";
import { PluginRouteHandler, AllRecipeConfigs, TypeInput, NormalisedAppinfo } from "./types";
import { version } from "./version";
import { PostSuperTokensInitCallbacks } from "./postSuperTokensInitCallbacks";
import { getPublicConfig } from "./utils";
import { isVersionCompatible } from "./versionChecker";

export function getPublicPlugin(plugin: SuperTokensPlugin): SuperTokensPublicPlugin {
    return {
        id: plugin.id,
        initialized: plugin.init ? false : true, // since the init method is optional, we default to true
        version: plugin.version,
        exports: plugin.exports,
        compatibleSDKVersions: plugin.compatibleSDKVersions,
    };
}

/**
 * Resolve plugin dependencies recursively, ensuring that each plugin is only added once.
 * @param plugin Plugin to process
 * @param publicConfig Supertokens Public config
 * @param pluginsAbove Plugins processed before this plugin
 * @param sdkVersion Current SDK version
 * @returns Resolved list of dependencies for the plugin
 */
export function getPluginDependencies({
    plugin,
    config,
    pluginsAbove,
    sdkVersion,
    normalisedAppInfo,
}: {
    plugin: SuperTokensPlugin;
    config: SuperTokensConfig;
    normalisedAppInfo: NormalisedAppinfo;
    pluginsAbove: SuperTokensPlugin[];
    sdkVersion: string;
}): SuperTokensPlugin[] {
    const publicConfig = getPublicConfig({ ...config, appInfo: normalisedAppInfo });

    function recurseDependencies(
        plugin: SuperTokensPlugin,
        dependencies?: SuperTokensPlugin[],
        visited?: Set<string>
    ): SuperTokensPlugin[] {
        if (dependencies === undefined) {
            dependencies = [];
        }
        if (visited === undefined) {
            visited = new Set();
        }
        if (visited.has(plugin.id)) {
            return dependencies;
        }
        visited.add(plugin.id);

        if (plugin.dependencies) {
            // Get the current plugin's dependencies
            const result = plugin.dependencies(publicConfig, pluginsAbove.map(getPublicPlugin), sdkVersion);
            if (result.status === "ERROR") {
                throw new Error(result.message);
            }
            if (result.pluginsToAdd) {
                // Recurse through each dependency to resolve their dependencies as well
                for (const dep of result.pluginsToAdd) {
                    recurseDependencies(dep, dependencies, visited);
                }
            }
        }

        dependencies.push(plugin);
        return dependencies;
    }

    return recurseDependencies(plugin);
}

export function applyPlugins<T extends keyof AllRecipeConfigs>(
    recipeId: T,
    config: AllRecipeConfigs[T] | undefined,
    plugins: NonNullable<SuperTokensPlugin["overrideMap"]>[]
): AllRecipeConfigs[T] {
    config = config ?? ({} as AllRecipeConfigs[T]);
    let functionLayers = [];
    let apiLayers = [];
    for (const plugin of plugins) {
        const overrides = plugin[recipeId];
        if (overrides) {
            config = overrides.config ? overrides.config(config) : config;
            if (overrides.functions !== undefined) {
                functionLayers.push(overrides.functions as any);
            }
            if (overrides.apis !== undefined) {
                apiLayers.push(overrides.apis as any);
            }
        }
    }
    functionLayers.push(config.override?.functions);
    apiLayers.push(config.override?.apis);

    functionLayers = functionLayers.filter((layer) => layer !== undefined);
    apiLayers = apiLayers.filter((layer) => layer !== undefined);
    if (recipeId !== "accountlinking" && apiLayers.length > 0) {
        config.override = {
            ...config.override,
            apis: (oI: any, builder: OverrideableBuilder<any>) => {
                for (const layer of apiLayers) {
                    builder.override(layer as any);
                }
                return oI as any;
            },
        } as any;
    }
    if (functionLayers.length > 0) {
        config.override = {
            ...config.override,
            functions: (oI: any, builder: OverrideableBuilder<any>) => {
                for (const layer of functionLayers) {
                    builder.override(layer as any);
                }
                return oI as any;
            },
        };
    }
    return config;
}

/**
 * Processes the list of plugins, resolving dependencies, applying overrides, and collecting route handlers.
 */
export function loadPlugins({
    plugins,
    config,
    normalisedAppInfo,
}: {
    plugins: SuperTokensPlugin[];
    config: TypeInput;
    normalisedAppInfo: NormalisedAppinfo;
}): {
    config: TypeInput;
    pluginRouteHandlers: (PluginRouteHandler & { pluginId: string })[];
    overrideMaps: Record<string, any>[];
} {
    const inputPluginList = plugins ?? [];
    const finalPluginList: SuperTokensPlugin[] = [];
    const seenPlugins: Set<string> = new Set();
    for (const plugin of inputPluginList) {
        if (seenPlugins.has(plugin.id)) {
            continue;
        }

        if (plugin.compatibleSDKVersions) {
            const versionCheck = isVersionCompatible(version, plugin.compatibleSDKVersions);
            if (!versionCheck) {
                throw new Error(
                    `Incompatible SDK version for plugin ${
                        plugin.id
                    }. Version "${version}" not found in compatible versions: ${JSON.stringify(
                        plugin.compatibleSDKVersions
                    )}`
                );
            }
        }

        const dependencies = getPluginDependencies({
            plugin,
            config,
            pluginsAbove: finalPluginList,
            sdkVersion: version,
            normalisedAppInfo,
        });
        finalPluginList.push(...dependencies);

        for (const dep of dependencies) {
            seenPlugins.add(dep.id);
        }
    }

    const duplicatePluginIds = finalPluginList.filter((plugin, index) =>
        finalPluginList.some((elem, idx) => elem.id === plugin.id && idx !== index)
    );
    if (duplicatePluginIds.length > 0) {
        throw new Error(`Duplicate plugin IDs: ${duplicatePluginIds.map((plugin) => plugin.id).join(", ")}`);
    }

    const processedPlugins: SuperTokensPublicPlugin[] = finalPluginList.map(getPublicPlugin);

    let _config = { ...config };
    const pluginRouteHandlers: (PluginRouteHandler & { pluginId: string })[] = [];
    for (const [pluginIndex, plugin] of finalPluginList.entries()) {
        if (plugin.config) {
            // @ts-ignore
            const { appInfo, recipeList, experimental, ...pluginConfigOverride } = plugin.config(
                getPublicConfig({ ..._config, appInfo: normalisedAppInfo })
            );
            _config = { ..._config, ...pluginConfigOverride };
        }

        const publicConfig = getPublicConfig({
            ..._config,
            appInfo: normalisedAppInfo,
        });

        if (plugin.routeHandlers) {
            let handlers: (PluginRouteHandler & { pluginId: string })[] = [];
            if (typeof plugin.routeHandlers === "function") {
                const result = plugin.routeHandlers(publicConfig, processedPlugins, version);
                if (result.status === "ERROR") {
                    throw new Error(result.message);
                }
                handlers = result.routeHandlers.map((handler) => ({ ...handler, pluginId: plugin.id }));
            } else {
                handlers = plugin.routeHandlers.map((handler) => ({ ...handler, pluginId: plugin.id }));
            }

            pluginRouteHandlers.push(...handlers);
        }

        if (plugin.init) {
            PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                plugin.init!(publicConfig, processedPlugins, version);
                processedPlugins[pluginIndex].initialized = true;
            });
        }
    }

    const overrideMaps = finalPluginList
        .filter((p) => p.overrideMap !== undefined)
        .map((p) => p.overrideMap) as NonNullable<SuperTokensPlugin["overrideMap"]>[];

    return {
        config: _config,
        pluginRouteHandlers,
        overrideMaps,
    };
}
