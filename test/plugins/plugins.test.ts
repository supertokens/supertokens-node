import { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } from "../utils";
import {
    apiOverrideFactory,
    functionOverrideFactory,
    Plugin1,
    Plugin2,
    Plugin3Dep1,
    Plugin3Dep2_1,
    Plugin4Dep1,
    Plugin4Dep2,
    Plugin4Dep3__2_1,
    pluginFactory,
} from "./plugins";
import PluginTestRecipe from "./recipe";
import STExpress from "../..";
import { SuperTokensPlugin, SuperTokensPublicConfig } from "../../lib/build";
import assert from "assert";
import SuperTokens from "../../lib/build/supertokens";
import { PluginRouteHandler, UserContext } from "../../lib/build/types";
import { DummyRequest, DummyResponse } from "./misc";
// let STExpress = require("../..");
// let assert = require("assert");
// let { ProcessState } = require("../../lib/build/processState");
// let PluginTestRecipe = require("./plugins").default;

function recipeFactory({ overrideFunctions, overrideApis }: { overrideFunctions: boolean; overrideApis: boolean }) {
    return PluginTestRecipe.init({
        override: {
            functions: overrideFunctions ? functionOverrideFactory("override") : (oI) => oI,
            apis: overrideApis ? apiOverrideFactory("override") : (oI) => oI,
        },
    });
}

const partialSupertokensConfig = {
    appInfo: {
        appName: "pluginsTest",
        apiDomain: "api.supertokens.io",
        origin: "http://localhost:3001",
    },
    supertokens: {
        connectionURI: "http://localhost:3567",
    },
};

describe("Plugin Tests", () => {
    beforeEach(() => {
        resetAll();
        PluginTestRecipe.reset();
    });

    describe("Overrides", () => {
        const overrideTestParams: [
            boolean,
            boolean,
            { identifier: string; overrideFunctions: boolean; overrideApis: boolean }[],
            string[],
            string[]
        ][] = [
            // [fnOverride, apiOverride, plugins, expectedFnStack, expectedApiStack]
            // No plugins
            [false, false, [], ["original"], ["original"]],
            [true, false, [], ["override", "original"], ["original"]],
            [false, true, [], ["original"], ["override", "original"]],
            // Single plugin with overrides
            [
                true,
                false,
                [{ identifier: "plugin1", overrideFunctions: true, overrideApis: false }],
                ["override", "plugin1", "original"],
                ["original"],
            ],
            [
                true,
                false,
                [{ identifier: "plugin1", overrideFunctions: false, overrideApis: true }],
                ["override", "original"],
                ["plugin1", "original"],
            ],
            [
                false,
                true,
                [{ identifier: "plugin1", overrideFunctions: true, overrideApis: false }],
                ["plugin1", "original"],
                ["override", "original"],
            ],
            [
                false,
                true,
                [{ identifier: "plugin1", overrideFunctions: false, overrideApis: true }],
                ["original"],
                ["override", "plugin1", "original"],
            ],
            // Multiple plugins with overrides
            [
                true,
                false,
                [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: false },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: false },
                ],
                ["override", "plugin2", "plugin1", "original"],
                ["original"],
            ],
            [
                false,
                true,
                [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true },
                    { identifier: "plugin2", overrideFunctions: false, overrideApis: true },
                ],
                ["original"],
                ["override", "plugin2", "plugin1", "original"],
            ],
            // Multiple plugins, all overrides
            [
                true,
                true,
                [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: true },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: true },
                ],
                ["override", "plugin2", "plugin1", "original"],
                ["override", "plugin2", "plugin1", "original"],
            ],
        ];

        overrideTestParams.forEach(
            ([fnOverride, apiOverride, pluginFactortyConfigs, expectedFnStack, expectedApiStack]) => {
                const plugins = pluginFactortyConfigs.map((pfc) => pluginFactory(pfc));

                const testNameList = [
                    `fnOverride=${fnOverride}`,
                    `apiOverride=${apiOverride}`,
                    `plugins=[${plugins.map((p) => p.id).join(",")}]`,
                    ...pluginFactortyConfigs.map((pfc) => {
                        const overrideList: string[] = [];
                        if (pfc.overrideFunctions) {
                            overrideList.push("fn");
                        }
                        if (pfc.overrideApis) {
                            overrideList.push("api");
                        }
                        return `${pfc.identifier}=[${overrideList.join(",")}]`;
                    }),
                ];
                const testName = testNameList.join(", ");

                it(testName, () => {
                    STExpress.init({
                        ...partialSupertokensConfig,
                        recipeList: [recipeFactory({ overrideFunctions: fnOverride, overrideApis: apiOverride })],
                        experimental: {
                            plugins,
                        },
                    });

                    const recipe = PluginTestRecipe.getInstanceOrThrowError();
                    const recipeOutput = recipe.recipeInterfaceImpl.signIn("msg", []);
                    const apiOutput = recipe.apiImpl.signInPOST("msg", []);

                    assert.deepEqual(recipeOutput.stack, expectedFnStack);
                    assert.deepEqual(apiOutput.stack, expectedApiStack);
                    assert.deepEqual(recipeOutput.message, "msg");
                    assert.deepEqual(apiOutput.message, "msg");
                });
            }
        );
    });

    describe("Dependencies", () => {
        const dependencyTestParams: [SuperTokensPlugin[], string[], string[], string][] = [
            [[Plugin1, Plugin1], ["plugin1", "original"], ["original"], "1,1 => 1"],
            [[Plugin1, Plugin2], ["plugin2", "plugin1", "original"], ["original"], "1,2 => 2,1"],
            [[Plugin3Dep1], ["plugin3dep1", "plugin1", "original"], ["original"], "3->1 => 3,1"],
            [[Plugin3Dep2_1], ["plugin3dep2_1", "plugin1", "plugin2", "original"], ["original"], "3->(2,1) => 3,2,1"],
            [
                [Plugin3Dep1, Plugin4Dep2],
                ["plugin4dep2", "plugin2", "plugin3dep1", "plugin1", "original"],
                ["original"],
                "3->1,4->2 => 4,2,3,1",
            ],
            [
                [Plugin4Dep3__2_1],
                ["plugin4dep3__2_1", "plugin3dep2_1", "plugin1", "plugin2", "original"],
                ["original"],
                "4->3->(2,1) => 4,3,1,2",
            ],
            [
                [Plugin3Dep1, Plugin4Dep1],
                ["plugin4dep1", "plugin3dep1", "plugin1", "original"],
                ["original"],
                "3->1,4->1 => 4,3,1",
            ],
        ];

        dependencyTestParams.forEach(([plugins, expectedFnStack, expectedApiStack, testName]) => {
            it(testName, () => {
                STExpress.init({
                    ...partialSupertokensConfig,
                    recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                    experimental: {
                        plugins,
                    },
                });

                const recipe = PluginTestRecipe.getInstanceOrThrowError();
                const recipeOutput = recipe.recipeInterfaceImpl.signIn("msg", []);
                const apiOutput = recipe.apiImpl.signInPOST("msg", []);

                assert.deepEqual(recipeOutput.stack, expectedFnStack);
                assert.deepEqual(apiOutput.stack, expectedApiStack);
                assert.deepEqual(recipeOutput.message, "msg");
                assert.deepEqual(apiOutput.message, "msg");
            });
        });
    });

    describe("Config Overrides", () => {
        it("override public property", () => {
            const plugin = pluginFactory({
                identifier: "plugin1",
                overrideFunctions: false,
                overrideApis: false,
            });
            plugin.config = (oC: SuperTokensPublicConfig) => ({
                ...oC,
                appInfo: { ...oC.appInfo, appName: "override" },
            });

            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                experimental: {
                    plugins: [plugin],
                },
            });

            assert.strictEqual(SuperTokens.getInstanceOrThrowError().appInfo.appName, "override");
        });

        it("override non-public property", () => {
            const plugin = pluginFactory({
                identifier: "plugin1",
                overrideFunctions: false,
                overrideApis: false,
            });
            plugin.config = (oC: SuperTokensPublicConfig) => ({ ...oC, recipeList: [] });

            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                experimental: {
                    plugins: [plugin],
                },
            });

            assert.notDeepEqual(SuperTokens.getInstanceOrThrowError().recipeModules, []);
        });
    });

    describe("Route Handlers", () => {
        const routeHandler: PluginRouteHandler = {
            method: "get",
            path: "/auth/plugin1/hello",
            handler: async (req, res, session, userContext) => {
                // @ts-ignore
                res.data = "plugin1";
                return null;
            },
        };

        it("as list", async () => {
            const plugin = pluginFactory({
                identifier: "plugin1",
                overrideFunctions: false,
                overrideApis: false,
            });
            plugin.routeHandlers = [routeHandler];

            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                experimental: {
                    plugins: [plugin],
                },
            });

            const stInstance = SuperTokens.getInstanceOrThrowError();

            const resObject = new DummyResponse();
            const res = await stInstance.middleware(new DummyRequest(), resObject, {} as UserContext);
            assert.strictEqual(res, true);
            assert.deepEqual(resObject.data, "plugin1");
        });

        describe("as function", () => {
            it("success", async () => {
                const plugin = pluginFactory({
                    identifier: "plugin1",
                    overrideFunctions: false,
                    overrideApis: false,
                });
                plugin.routeHandlers = () => ({ status: "OK", routeHandlers: [routeHandler] });

                STExpress.init({
                    ...partialSupertokensConfig,
                    recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                    experimental: {
                        plugins: [plugin],
                    },
                });

                const stInstance = SuperTokens.getInstanceOrThrowError();

                const resObject = new DummyResponse();
                const res = await stInstance.middleware(new DummyRequest(), resObject, {} as UserContext);
                assert.strictEqual(res, true);
                assert.deepEqual(resObject.data, "plugin1");
            });

            it("error", async () => {
                try {
                    const plugin = pluginFactory({
                        identifier: "plugin1",
                        overrideFunctions: false,
                        overrideApis: false,
                    });
                    plugin.routeHandlers = () => ({ status: "ERROR", message: "error" });

                    STExpress.init({
                        ...partialSupertokensConfig,
                        recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false })],
                        experimental: {
                            plugins: [plugin],
                        },
                    });

                    const stInstance = SuperTokens.getInstanceOrThrowError();

                    const resObject = new DummyResponse();
                    const res = await stInstance.middleware(new DummyRequest(), resObject, {} as UserContext);
                } catch (err) {
                    assert.strictEqual(err.message, "error");
                }
            });
        });
    });
});
