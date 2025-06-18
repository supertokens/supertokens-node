import { resetAll } from "../utils";
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
import { PostSuperTokensInitCallbacks } from "../../lib/ts/postSuperTokensInitCallbacks";

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

describe("Plugins", () => {
    beforeEach(() => {
        resetAll();
        PluginTestRecipe.reset();
        PostSuperTokensInitCallbacks.postInitCallbacks = [];
    });

    describe("Overrides", () => {
        const overrideTestParams: {
            overrideFunctions: boolean;
            overrideApis: boolean;
            pluginFactortyConfigs: { identifier: string; overrideFunctions: boolean; overrideApis: boolean }[];
            expectedFunctionOrder: string[];
            expectedApiOrder: string[];
        }[] = [
            // No plugins
            {
                overrideFunctions: false,
                overrideApis: false,
                pluginFactortyConfigs: [],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["original"],
            },
            {
                overrideFunctions: true,
                overrideApis: false,
                pluginFactortyConfigs: [],
                expectedFunctionOrder: ["override", "original"],
                expectedApiOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                pluginFactortyConfigs: [],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "original"],
            },
            // Single plugin with overrides
            {
                overrideFunctions: true,
                overrideApis: false,
                pluginFactortyConfigs: [{ identifier: "plugin1", overrideFunctions: true, overrideApis: false }],
                expectedFunctionOrder: ["override", "plugin1", "original"],
                expectedApiOrder: ["original"],
            },
            {
                overrideFunctions: true,
                overrideApis: false,
                pluginFactortyConfigs: [{ identifier: "plugin1", overrideFunctions: false, overrideApis: true }],
                expectedFunctionOrder: ["override", "original"],
                expectedApiOrder: ["plugin1", "original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                pluginFactortyConfigs: [{ identifier: "plugin1", overrideFunctions: true, overrideApis: false }],
                expectedFunctionOrder: ["plugin1", "original"],
                expectedApiOrder: ["override", "original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                pluginFactortyConfigs: [{ identifier: "plugin1", overrideFunctions: false, overrideApis: true }],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "plugin1", "original"],
            },
            // Multiple plugins with overrides
            {
                overrideFunctions: true,
                overrideApis: false,
                pluginFactortyConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: false },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: false },
                ],
                expectedFunctionOrder: ["override", "plugin2", "plugin1", "original"],
                expectedApiOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                pluginFactortyConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true },
                    { identifier: "plugin2", overrideFunctions: false, overrideApis: true },
                ],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "plugin2", "plugin1", "original"],
            },
            // Multiple plugins, all overrides
            {
                overrideFunctions: true,
                overrideApis: true,
                pluginFactortyConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: true },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: true },
                ],
                expectedFunctionOrder: ["override", "plugin2", "plugin1", "original"],
                expectedApiOrder: ["override", "plugin2", "plugin1", "original"],
            },
        ];

        overrideTestParams.forEach(
            ({ overrideFunctions, overrideApis, pluginFactortyConfigs, expectedFunctionOrder, expectedApiOrder }) => {
                const plugins = pluginFactortyConfigs.map((pfc) => pluginFactory(pfc));

                const testNameList = [
                    `fnOverride=${overrideFunctions}`,
                    `apiOverride=${overrideApis}`,
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
                        recipeList: [
                            recipeFactory({ overrideFunctions: overrideFunctions, overrideApis: overrideApis }),
                        ],
                        experimental: {
                            plugins,
                        },
                    });

                    const recipe = PluginTestRecipe.getInstanceOrThrowError();
                    const recipeOutput = recipe.recipeInterfaceImpl.signIn("msg", []);
                    const apiOutput = recipe.apiImpl.signInPOST("msg", []);

                    assert.deepEqual(recipeOutput.stack, expectedFunctionOrder);
                    assert.deepEqual(apiOutput.stack, expectedApiOrder);
                    assert.deepEqual(recipeOutput.message, "msg");
                    assert.deepEqual(apiOutput.message, "msg");
                });
            }
        );
    });

    describe("Dependencies and Init", () => {
        const dependencyTestParams: {
            plugins: SuperTokensPlugin[];
            expectedFnOrder: string[];
            expectedApiOrder: string[];
            expectedInitOrder: string[];
            testName: string;
        }[] = [
            {
                plugins: [Plugin1, Plugin1],
                expectedFnOrder: ["plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin1"],
                testName: "1,1 => 1",
            },
            {
                plugins: [Plugin1, Plugin2],
                expectedFnOrder: ["plugin2", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin1", "plugin2"],
                testName: "1,2 => 2,1",
            },
            {
                plugins: [Plugin3Dep1],
                expectedFnOrder: ["plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin1", "plugin3dep1"],
                testName: "3->1 => 3,1",
            },
            {
                plugins: [Plugin3Dep2_1],
                expectedFnOrder: ["plugin3dep2_1", "plugin1", "plugin2", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin2", "plugin1", "plugin3dep2_1"],
                testName: "3->(2,1) => 3,2,1",
            },
            {
                plugins: [Plugin3Dep1, Plugin4Dep2],
                expectedFnOrder: ["plugin4dep2", "plugin2", "plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin1", "plugin3dep1", "plugin2", "plugin4dep2"],
                testName: "3->1,4->2 => 4,2,3,1",
            },
            {
                plugins: [Plugin4Dep3__2_1],
                expectedFnOrder: ["plugin4dep3__2_1", "plugin3dep2_1", "plugin1", "plugin2", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin2", "plugin1", "plugin3dep2_1", "plugin4dep3__2_1"],
                testName: "4->3->(2,1) => 4,3,1,2",
            },
            {
                plugins: [Plugin3Dep1, Plugin4Dep1],
                expectedFnOrder: ["plugin4dep1", "plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedInitOrder: ["plugin1", "plugin3dep1", "plugin4dep1"],
                testName: "3->1,4->1 => 4,3,1",
            },
        ];

        dependencyTestParams.forEach(({ plugins, expectedFnOrder, expectedApiOrder, expectedInitOrder, testName }) => {
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

                assert.deepEqual(recipeOutput.stack, expectedFnOrder);
                assert.deepEqual(apiOutput.stack, expectedApiOrder);
                assert.deepEqual(PluginTestRecipe.initCalls, expectedInitOrder);
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
