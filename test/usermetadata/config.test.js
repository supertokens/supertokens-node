const { printPath, createCoreApplication } = require("../utils");
const { ProcessState } = require("../../lib/build/processState");
const STExpress = require("../..");
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata/recipe").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/usermetadata/config.test.js]")}`, function () {
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
                recipeList: [UserMetadataRecipe.init()],
            });

            await UserMetadataRecipe.getInstanceOrThrowError();
        });
    });
});
