let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../dist/processState");
let STExpress = require("../../");
const JWTRecipe = require("../../dist/recipe/jwt/recipe").default;
let { Querier } = require("../../dist/querier");
const { maxVersion } = require("../../dist/utils");

describe(`configTest: ${printPath("[test/jwt/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that the default config sets values correctly for JWT recipe", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [JWTRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let jwtRecipe = await JWTRecipe.getInstanceOrThrowError();
        assert(jwtRecipe.config.jwtValiditySeconds === 3153600000);
    });

    it("Test that the config sets values correctly for JWT recipe when jwt validity is set", async function () {
        await startST();
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                JWTRecipe.init({
                    jwtValiditySeconds: 24 * 60 * 60, // 24 hours
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let jwtRecipe = await JWTRecipe.getInstanceOrThrowError();
        assert(jwtRecipe.config.jwtValiditySeconds === 24 * 60 * 60);
    });
});
