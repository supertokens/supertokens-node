let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const OpenIdRecipe = require("../../lib/build/recipe/openid/recipe").default;
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/openid/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that the default config sets values correctly for OpenID recipe", async function () {
        const connectionURI = await startST();
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

        let openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError();

        assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === "https://api.supertokens.io");
        assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === "/auth");
    });

    it("Test that the default config sets values correctly for OpenID recipe with apiBasePath", async function () {
        const connectionURI = await startST();
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

        let openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError();

        assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === "https://api.supertokens.io");
        assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === "");
    });

    it("Test that the config sets values correctly for OpenID recipe with issuer", async function () {
        const connectionURI = await startST();
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
                    issuer: "https://customissuer.com",
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError();

        assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === "https://customissuer.com");
        assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === "");
    });

    it("Test that issuer without apiBasePath throws error", async function () {
        const connectionURI = await startST();

        try {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    OpenIdRecipe.init({
                        issuer: "https://customissuer.com",
                    }),
                ],
            });
        } catch (e) {
            if (
                e.message !== "The path of the issuer URL must be equal to the apiBasePath. The default value is /auth"
            ) {
                throw e;
            }
        }
    });

    it("Test that issuer with gateway path works fine", async function () {
        const connectionURI = await startST();
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

        let openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError();

        assert.equal(openIdRecipe.config.issuerDomain.getAsStringDangerous(), "https://api.supertokens.io");
        assert.equal(openIdRecipe.config.issuerPath.getAsStringDangerous(), "/gateway/auth");
    });
});
