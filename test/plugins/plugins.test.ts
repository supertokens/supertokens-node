import { resetAll } from "../utils";
import {
    apiOverrideFactory,
    configOverrideFactory,
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
import * as plugins from "../../lib/build/plugins";
import { PluginRouteHandler, UserContext } from "../../lib/build/types";
import { DummyRequest, DummyResponse } from "./misc";
import { PostSuperTokensInitCallbacks } from "../../lib/ts/postSuperTokensInitCallbacks";
import sinon from "sinon";

function recipeFactory({
    overrideFunctions,
    overrideApis,
    overrideConfig,
}: {
    overrideFunctions: boolean;
    overrideApis: boolean;
    overrideConfig: boolean;
}) {
    let originalConfig = {
        override: {
            functions: overrideFunctions ? functionOverrideFactory("override") : (oI) => oI,
            apis: overrideApis ? apiOverrideFactory("override") : (oI) => oI,
        },
        testProperty: [],
    };
    const config = overrideConfig
        ? configOverrideFactory("override")(originalConfig)
        : configOverrideFactory("original")(originalConfig);
    return PluginTestRecipe.init(config);
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
            overrideConfig: boolean;
            pluginFactoryConfigs: {
                identifier: string;
                overrideFunctions: boolean;
                overrideApis: boolean;
                overrideConfig: boolean;
            }[];
            expectedFunctionOrder: string[];
            expectedApiOrder: string[];
            expectedConfigOrder: string[];
        }[] = [
            // No plugins
            {
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: false,
                pluginFactoryConfigs: [],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: true,
                overrideApis: false,
                overrideConfig: false,
                pluginFactoryConfigs: [],
                expectedFunctionOrder: ["override", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                overrideConfig: false,
                pluginFactoryConfigs: [],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: true,
                pluginFactoryConfigs: [],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["override"],
            },
            // Single plugin with overrides
            {
                overrideFunctions: true,
                overrideApis: false,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: false, overrideConfig: false },
                ],
                expectedFunctionOrder: ["override", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: true,
                overrideApis: false,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true, overrideConfig: false },
                ],
                expectedFunctionOrder: ["override", "original"],
                expectedApiOrder: ["plugin1", "original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: false, overrideConfig: false },
                ],
                expectedFunctionOrder: ["plugin1", "original"],
                expectedApiOrder: ["override", "original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true, overrideConfig: false },
                ],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "plugin1", "original"],
                expectedConfigOrder: ["original"],
            },
            {
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: true,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true, overrideConfig: false },
                ],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["plugin1", "original"],
                expectedConfigOrder: ["override"],
            },
            {
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: true,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true, overrideConfig: true },
                ],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["plugin1", "original"],
                expectedConfigOrder: ["override", "plugin1"],
            },
            // Multiple plugins with overrides
            {
                overrideFunctions: true,
                overrideApis: false,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: false, overrideConfig: true },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: false, overrideConfig: false },
                ],
                expectedFunctionOrder: ["override", "plugin2", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1"],
            },
            {
                overrideFunctions: false,
                overrideApis: true,
                overrideConfig: false,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: false, overrideApis: true, overrideConfig: false },
                    { identifier: "plugin2", overrideFunctions: false, overrideApis: true, overrideConfig: true },
                ],
                expectedFunctionOrder: ["original"],
                expectedApiOrder: ["override", "plugin2", "plugin1", "original"],
                expectedConfigOrder: ["original", "plugin2"],
            },
            // Multiple plugins, all overrides
            {
                overrideFunctions: true,
                overrideApis: true,
                overrideConfig: true,
                pluginFactoryConfigs: [
                    { identifier: "plugin1", overrideFunctions: true, overrideApis: true, overrideConfig: true },
                    { identifier: "plugin2", overrideFunctions: true, overrideApis: true, overrideConfig: true },
                ],
                expectedFunctionOrder: ["override", "plugin2", "plugin1", "original"],
                expectedApiOrder: ["override", "plugin2", "plugin1", "original"],
                expectedConfigOrder: ["override", "plugin1", "plugin2"],
            },
        ];

        overrideTestParams.forEach(
            (
                {
                    overrideFunctions,
                    overrideApis,
                    overrideConfig,
                    pluginFactoryConfigs,
                    expectedFunctionOrder,
                    expectedApiOrder,
                    expectedConfigOrder,
                },
                testNo,
            ) => {
                const plugins = pluginFactoryConfigs.map((pfc) => pluginFactory(pfc));

                const testNameList = [
                    `${testNo}. fnOverride=${overrideFunctions}`,
                    `apiOverride=${overrideApis}`,
                    `configOverride=${overrideConfig}`,
                    `plugins=[${plugins.map((p) => p.id).join(",")}]`,
                    ...pluginFactoryConfigs.map((pfc) => {
                        const overrideList: string[] = [];
                        if (pfc.overrideFunctions) {
                            overrideList.push("fn");
                        }
                        if (pfc.overrideApis) {
                            overrideList.push("api");
                        }
                        if (pfc.overrideConfig) {
                            overrideList.push("config");
                        }
                        return `${pfc.identifier}=[${overrideList.join(",")}]`;
                    }),
                ];
                const testName = testNameList.join(", ");

                it(testName, () => {
                    STExpress.init({
                        ...partialSupertokensConfig,
                        recipeList: [
                            recipeFactory({
                                overrideFunctions: overrideFunctions,
                                overrideApis: overrideApis,
                                overrideConfig: overrideConfig,
                            }),
                        ],
                        experimental: {
                            plugins,
                        },
                    });

                    const recipe = PluginTestRecipe.getInstanceOrThrowError();
                    const recipeOutput = recipe.recipeInterfaceImpl.signIn("msg", []);
                    const apiOutput = recipe.apiImpl.signInPOST("msg", []);
                    const configOutput = recipe.configImpl;

                    assert.deepEqual(recipeOutput.stack, expectedFunctionOrder);
                    assert.deepEqual(apiOutput.stack, expectedApiOrder);
                    assert.deepEqual(recipeOutput.message, "msg");
                    assert.deepEqual(apiOutput.message, "msg");
                    assert.deepEqual(configOutput.testProperty, expectedConfigOrder);
                });
            },
        );
    });

    describe("Dependencies and Init", () => {
        const dependencyTestParams: {
            plugins: SuperTokensPlugin[];
            expectedFnOrder: string[];
            expectedApiOrder: string[];
            expectedConfigOrder: string[];
            expectedInitOrder: string[];
            testName: string;
        }[] = [
            {
                plugins: [Plugin1, Plugin1],
                expectedFnOrder: ["plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1"],
                expectedInitOrder: ["plugin1"],
                testName: "1,1 => 1",
            },
            {
                plugins: [Plugin1, Plugin2],
                expectedFnOrder: ["plugin2", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1", "plugin2"],
                expectedInitOrder: ["plugin1", "plugin2"],
                testName: "1,2 => 2,1",
            },
            {
                plugins: [Plugin3Dep1],
                expectedFnOrder: ["plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1", "plugin3dep1"],
                expectedInitOrder: ["plugin1", "plugin3dep1"],
                testName: "3->1 => 3,1",
            },
            {
                plugins: [Plugin3Dep2_1],
                expectedFnOrder: ["plugin3dep2_1", "plugin1", "plugin2", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin2", "plugin1", "plugin3dep2_1"],
                expectedInitOrder: ["plugin2", "plugin1", "plugin3dep2_1"],
                testName: "3->(2,1) => 3,2,1",
            },
            {
                plugins: [Plugin3Dep1, Plugin4Dep2],
                expectedFnOrder: ["plugin4dep2", "plugin2", "plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1", "plugin3dep1", "plugin2", "plugin4dep2"],
                expectedInitOrder: ["plugin1", "plugin3dep1", "plugin2", "plugin4dep2"],
                testName: "3->1,4->2 => 4,2,3,1",
            },
            {
                plugins: [Plugin4Dep3__2_1],
                expectedFnOrder: ["plugin4dep3__2_1", "plugin3dep2_1", "plugin1", "plugin2", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin2", "plugin1", "plugin3dep2_1", "plugin4dep3__2_1"],
                expectedInitOrder: ["plugin2", "plugin1", "plugin3dep2_1", "plugin4dep3__2_1"],
                testName: "4->3->(2,1) => 4,3,1,2",
            },
            {
                plugins: [Plugin3Dep1, Plugin4Dep1],
                expectedFnOrder: ["plugin4dep1", "plugin3dep1", "plugin1", "original"],
                expectedApiOrder: ["original"],
                expectedConfigOrder: ["original", "plugin1", "plugin3dep1", "plugin4dep1"],
                expectedInitOrder: ["plugin1", "plugin3dep1", "plugin4dep1"],
                testName: "3->1,4->1 => 4,3,1",
            },
        ];

        dependencyTestParams.forEach(
            ({ plugins, expectedFnOrder, expectedApiOrder, expectedConfigOrder, expectedInitOrder, testName }) => {
                it(testName, () => {
                    STExpress.init({
                        ...partialSupertokensConfig,
                        recipeList: [
                            recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false }),
                        ],
                        experimental: {
                            plugins,
                        },
                    });

                    const recipe = PluginTestRecipe.getInstanceOrThrowError();
                    const recipeOutput = recipe.recipeInterfaceImpl.signIn("msg", []);
                    const apiOutput = recipe.apiImpl.signInPOST("msg", []);
                    const configOutput = recipe.configImpl;

                    assert.deepEqual(recipeOutput.stack, expectedFnOrder);
                    assert.deepEqual(apiOutput.stack, expectedApiOrder);
                    assert.deepEqual(PluginTestRecipe.initCalls, expectedInitOrder);
                    assert.deepEqual(recipeOutput.message, "msg");
                    assert.deepEqual(apiOutput.message, "msg");
                    assert.deepEqual(configOutput.testProperty, expectedConfigOrder);
                });
            },
        );
    });

    describe("Config Overrides", () => {
        it("override public property should not be applied", () => {
            const plugin = pluginFactory({
                identifier: "plugin1",
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: false,
            });
            plugin.config = (oC: SuperTokensPublicConfig) => {
                const newoc = {
                    ...oC,
                    appInfo: { ...oC.appInfo, appName: "override" },
                };
                return newoc;
            };

            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false })],
                experimental: {
                    plugins: [plugin],
                },
            });

            assert.strictEqual(SuperTokens.getInstanceOrThrowError().appInfo.appName, "pluginsTest");
        });

        it("override non-public property", () => {
            const plugin = pluginFactory({
                identifier: "plugin1",
                overrideFunctions: false,
                overrideApis: false,
                overrideConfig: false,
            });
            plugin.config = (oC: SuperTokensPublicConfig) => ({ ...oC, recipeList: [], experimental: {} });

            const loadPluginsSpy = sinon.spy(plugins, "loadPlugins");
            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false })],
                experimental: {
                    plugins: [plugin],
                },
            });

            assert.equal(loadPluginsSpy.callCount, 1);
            assert.notDeepEqual(loadPluginsSpy.returnValues[0].config.experimental, {});

            assert.notDeepEqual(SuperTokens.getInstanceOrThrowError().recipeModules, []);

            loadPluginsSpy.restore();
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
                overrideConfig: false,
            });
            plugin.routeHandlers = [routeHandler];

            STExpress.init({
                ...partialSupertokensConfig,
                recipeList: [recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false })],
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
                    overrideConfig: false,
                });
                plugin.routeHandlers = () => ({ status: "OK", routeHandlers: [routeHandler] });

                STExpress.init({
                    ...partialSupertokensConfig,
                    recipeList: [
                        recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false }),
                    ],
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
                        overrideConfig: false,
                    });
                    plugin.routeHandlers = () => ({ status: "ERROR", message: "error" });

                    STExpress.init({
                        ...partialSupertokensConfig,
                        recipeList: [
                            recipeFactory({ overrideFunctions: false, overrideApis: false, overrideConfig: false }),
                        ],
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
