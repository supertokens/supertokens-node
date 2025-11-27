const { printPath, createCoreApplication } = require("../utils");
const { ProcessState } = require("../../lib/build/processState");
const STExpress = require("../..");
const UserRolesRecipe = require("../../lib/build/recipe/userroles/recipe").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`configTest: ${printPath("[test/userroles/config.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    describe("recipe init", () => {
        it("should work fine without config", async function () {
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
                recipeList: [UserRolesRecipe.init(), SessionRecipe.init()],
            });

            await UserRolesRecipe.getInstanceOrThrowError();
        });
    });
});
