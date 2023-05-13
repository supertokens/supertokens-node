const { printPath, setupST, startST, killAllST, cleanST, resetAll } = require("./utils");
let STExpress = require("../");
let Dashboard = require("../dist/recipe/dashboard");
let DashboardRecipe = require("../dist/recipe/dashboard/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../dist/processState");

describe(`dashboard: ${printPath("[test/dashboard.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that normalised config is generated correctly", async function () {
        await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Dashboard.init()],
            });

            let config = DashboardRecipe.getInstanceOrThrowError().config;

            assert.equal(config.apiKey, undefined);
            assert.equal(config.authMode, "email-password");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Dashboard.init({ apiKey: "test" })],
            });

            let config = DashboardRecipe.getInstanceOrThrowError().config;

            assert.equal(config.authMode, "api-key");
            assert.equal(config.apiKey, "test");
        }
    });
});
