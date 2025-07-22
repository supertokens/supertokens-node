"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicPlugin = getPublicPlugin;
exports.getPluginDependencies = getPluginDependencies;
exports.applyPlugins = applyPlugins;
exports.loadPlugins = loadPlugins;
const version_1 = require("./version");
const postSuperTokensInitCallbacks_1 = require("./postSuperTokensInitCallbacks");
const utils_1 = require("./utils");
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
function getPluginDependencies({ plugin, config, pluginsAbove, sdkVersion, normalisedAppInfo }) {
    const publicConfig = (0, utils_1.getPublicConfig)(
        Object.assign(Object.assign({}, config), { appInfo: normalisedAppInfo })
    );
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
function loadPlugins({ plugins, config, normalisedAppInfo }) {
    const inputPluginList = plugins !== null && plugins !== void 0 ? plugins : [];
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
            throw new Error(
                `Plugin version mismatch. Version ${
                    version_1.version
                } not found in compatible versions: ${versionContraints.join(", ")}`
            );
        }
        const dependencies = getPluginDependencies({
            plugin,
            config,
            pluginsAbove: finalPluginList,
            sdkVersion: version_1.version,
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
    const processedPlugins = finalPluginList.map(getPublicPlugin);
    let _config = Object.assign({}, config);
    const pluginRouteHandlers = [];
    for (const [pluginIndex, plugin] of finalPluginList.entries()) {
        if (plugin.config) {
            // @ts-ignore
            const _a = plugin.config(
                    (0, utils_1.getPublicConfig)(
                        Object.assign(Object.assign({}, _config), { appInfo: normalisedAppInfo })
                    )
                ),
                { appInfo } = _a,
                pluginConfigOverride = __rest(_a, ["appInfo"]);
            _config = Object.assign(Object.assign({}, _config), pluginConfigOverride);
        }
        const publicConfig = (0, utils_1.getPublicConfig)(
            Object.assign(Object.assign({}, _config), { appInfo: normalisedAppInfo })
        );
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
        config: _config,
        pluginRouteHandlers,
        overrideMaps,
    };
}
