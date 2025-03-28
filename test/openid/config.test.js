let assert = require("assert");

const { printPath, createCoreApplication } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const OpenIdRecipe = require("../../lib/build/recipe/openid/recipe").default;
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/openid/config.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    after(async function () {});

    it("Test that the default config sets values correctly for OpenID recipe", async function () {
        const connectionURI = await createCoreApplication();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [OpenIdRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        assert((await OpenIdRecipe.getIssuer()) === "https://api.supertokens.io/auth");
    });

    it("Test that the default config sets values correctly for OpenID recipe with apiBasePath", async function () {
        const connectionURI = await createCoreApplication();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                apiBasePath: "/",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [OpenIdRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        assert((await OpenIdRecipe.getIssuer()) === "https://api.supertokens.io");
    });

    it("Test that the config sets values correctly for OpenID recipe with issuer", async function () {
        const connectionURI = await createCoreApplication();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                apiBasePath: "/",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                OpenIdRecipe.init({
                    override: {
                        functions: (originalImplementation) => ({
                            ...originalImplementation,
                            getOpenIdDiscoveryConfiguration: async (input) => {
                                const orig = originalImplementation.getOpenIdDiscoveryConfiguration(input);
                                return {
                                    ...orig,
                                    issuer: "https://customissuer.com",
                                };
                            },
                        }),
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        assert((await OpenIdRecipe.getIssuer()) === "https://customissuer.com");
    });

    it("Test that issuer with gateway path works fine", async function () {
        const connectionURI = await createCoreApplication();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                apiGatewayPath: "/gateway",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [OpenIdRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        assert.equal(await OpenIdRecipe.getIssuer(), "https://api.supertokens.io/gateway/auth");
    });
});
