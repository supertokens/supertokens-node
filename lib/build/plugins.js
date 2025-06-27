"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicPlugin = getPublicPlugin;
exports.getPluginDependencies = getPluginDependencies;
exports.applyPlugins = applyPlugins;
exports.loadPlugins = loadPlugins;
const version_1 = require("./version");
const postSuperTokensInitCallbacks_1 = require("./postSuperTokensInitCallbacks");
function getPublicPlugin(plugin) {
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
function getPluginDependencies(plugin, publicConfig, pluginsAbove, sdkVersion) {
    function recurseDependencies(plugin, dependencies, visited) {
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
function applyPlugins(recipeId, config, plugins) {
    var _a, _b;
    config = config !== null && config !== void 0 ? config : {};
    let functionLayers = [];
    let apiLayers = [];
    for (const plugin of plugins) {
        const overrides = plugin[recipeId];
        if (overrides) {
            config = overrides.config ? overrides.config(config) : config;
            if (overrides.functions !== undefined) {
                functionLayers.push(overrides.functions);
            }
            if (overrides.apis !== undefined) {
                apiLayers.push(overrides.apis);
            }
        }
    }
    functionLayers.push((_a = config.override) === null || _a === void 0 ? void 0 : _a.functions);
    apiLayers.push((_b = config.override) === null || _b === void 0 ? void 0 : _b.apis);
    functionLayers = functionLayers.filter((layer) => layer !== undefined);
    apiLayers = apiLayers.filter((layer) => layer !== undefined);
    if (recipeId !== "accountlinking" && apiLayers.length > 0) {
        config.override = Object.assign(Object.assign({}, config.override), {
            apis: (oI, builder) => {
                for (const layer of apiLayers) {
                    builder.override(layer);
                }
                return oI;
            },
        });
    }
    if (functionLayers.length > 0) {
        config.override = Object.assign(Object.assign({}, config.override), {
            functions: (oI, builder) => {
                for (const layer of functionLayers) {
                    builder.override(layer);
                }
                return oI;
            },
        });
    }
    return config;
}
/**
 * Processes the list of plugins, resolving dependencies, applying overrides, and collecting route handlers.
 */
function loadPlugins({ plugins, publicConfig }) {
    const inputPluginList = plugins !== null && plugins !== void 0 ? plugins : [];
    const pluginRouteHandlers = [];
    const finalPluginList = [];
    const seenPlugins = new Set();
    for (const plugin of inputPluginList) {
        if (seenPlugins.has(plugin.id)) {
            continue;
        }
        const versionContraints = Array.isArray(plugin.compatibleSDKVersions)
            ? plugin.compatibleSDKVersions
            : [plugin.compatibleSDKVersions];
        if (!versionContraints.includes(version_1.version)) {
            // TODO: better checks
            throw new Error("Plugin version mismatch");
        }
        const dependencies = getPluginDependencies(plugin, publicConfig, finalPluginList, version_1.version);
        finalPluginList.push(...dependencies);
        for (const dep of dependencies) {
            seenPlugins.add(dep.id);
        }
    }
    const processedPlugins = finalPluginList.map(getPublicPlugin);
    for (const [pluginIndex, plugin] of finalPluginList.entries()) {
        if (plugin.config) {
            publicConfig = Object.assign(Object.assign({}, publicConfig), plugin.config(publicConfig));
        }
        if (plugin.routeHandlers) {
            let handlers = [];
            if (typeof plugin.routeHandlers === "function") {
                const result = plugin.routeHandlers(publicConfig, processedPlugins, version_1.version);
                if (result.status === "ERROR") {
                    throw new Error(result.message);
                }
                handlers = result.routeHandlers;
            } else {
                handlers = plugin.routeHandlers;
            }
            pluginRouteHandlers.push(...handlers);
        }
        if (plugin.init) {
            postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                plugin.init(publicConfig, processedPlugins, version_1.version);
                processedPlugins[pluginIndex].initialized = true;
            });
        }
    }
    const overrideMaps = finalPluginList.filter((p) => p.overrideMap !== undefined).map((p) => p.overrideMap);
    return {
        publicConfig,
        pluginRouteHandlers,
        overrideMaps,
    };
}
