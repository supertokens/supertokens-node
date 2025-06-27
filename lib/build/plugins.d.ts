// @ts-nocheck
import { SuperTokensPlugin, SuperTokensPublicConfig, SuperTokensPublicPlugin } from ".";
import { PluginRouteHandler, AllRecipeConfigs } from "./types";
export declare function getPublicPlugin(plugin: SuperTokensPlugin): SuperTokensPublicPlugin;
/**
 * Resolve plugin dependencies recursively, ensuring that each plugin is only added once.
 * @param plugin Plugin to process
 * @param publicConfig Supertokens Public config
 * @param pluginsAbove Plugins processed before this plugin
 * @param sdkVersion Current SDK version
 * @returns Resolved list of dependencies for the plugin
 */
export declare function getPluginDependencies(
    plugin: SuperTokensPlugin,
    publicConfig: SuperTokensPublicConfig,
    pluginsAbove: SuperTokensPlugin[],
    sdkVersion: string
): SuperTokensPlugin[];
export declare function applyPlugins<T extends keyof AllRecipeConfigs>(
    recipeId: T,
    config: AllRecipeConfigs[T] | undefined,
    plugins: NonNullable<SuperTokensPlugin["overrideMap"]>[]
): AllRecipeConfigs[T];
/**
 * Processes the list of plugins, resolving dependencies, applying overrides, and collecting route handlers.
 */
export declare function loadPlugins({
    plugins,
    publicConfig,
}: {
    plugins: SuperTokensPlugin[];
    publicConfig: SuperTokensPublicConfig;
}): {
    publicConfig: SuperTokensPublicConfig;
    pluginRouteHandlers: PluginRouteHandler[];
    overrideMaps: Record<string, any>[];
};
