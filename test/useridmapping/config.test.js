const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const { ProcessState } = require("../../lib/build/processState");
const STExpress = require("../..");
const UserIdMappingRecipe = require("../../lib/build/recipe/useridmapping/recipe").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/useridmapping/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("recipe init", () => {
        it("should work fine without config", async function () {
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
                recipeList: [UserIdMappingRecipe.init()],
            });

            // Only run for version >= 2.15
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            await UserIdMappingRecipe.getInstanceOrThrowError();
        });
    });
});
