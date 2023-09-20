let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const OpenIdRecipe = require("../../lib/build/recipe/openid/recipe").default;
const OpenId = require("../../lib/build/recipe/openid");
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`openIdTest: ${printPath("[test/openid/openid.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that with default config discovery configuration is as expected", async function () {
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

        let discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration();

        assert.equal(discoveryConfig.issuer, "https://api.supertokens.io/auth");
        assert.equal(discoveryConfig.jwks_uri, "https://api.supertokens.io/auth/jwt/jwks.json");
    });

    it("Test that with default config discovery configuration is as expected with api base path", async function () {
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

        let discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration();

        assert.equal(discoveryConfig.issuer, "https://api.supertokens.io");
        assert.equal(discoveryConfig.jwks_uri, "https://api.supertokens.io/jwt/jwks.json");
    });

    it("Test that with default config discovery configuration is as expected with custom issuer", async function () {
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
            recipeList: [
                OpenIdRecipe.init({
                    issuer: "https://cusomissuer/auth",
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration();

        assert.equal(discoveryConfig.issuer, "https://cusomissuer/auth");
        assert.equal(discoveryConfig.jwks_uri, "https://cusomissuer/auth/jwt/jwks.json");
    });
});
