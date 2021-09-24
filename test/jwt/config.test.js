let assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const JWTRecipe = require("../../lib/build/recipe/jwt/recipe").default;

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

        let jwtRecipe = await JWTRecipe.getInstanceOrThrowError();
        assert(jwtRecipe.config.jwtValiditySeconds === 24 * 60 * 60);
    });
});
