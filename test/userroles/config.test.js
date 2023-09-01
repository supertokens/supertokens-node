const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const { ProcessState } = require("../../lib/build/processState");
const STExpress = require("../..");
const UserRolesRecipe = require("../../lib/build/recipe/userroles/recipe").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`configTest: ${printPath("[test/userroles/config.test.js]")}`, function () {
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
                recipeList: [UserRolesRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            await UserRolesRecipe.getInstanceOrThrowError();
        });
    });
});
