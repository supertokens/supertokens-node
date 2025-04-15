let assert = require("assert");

const { printPath, createCoreApplication } = require("../utils");
let { ProcessState } = require("../../lib/build/processState");
let STExpress = require("../../");
const OAuth2ProviderRecipe = require("../../lib/build/recipe/oauth2provider/recipe").default;
let { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`configTest: ${printPath("[test/oauth2/config.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    it("Test that the recipe initializes without a config obj", async function () {
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
            recipeList: [OAuth2ProviderRecipe.init()],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        OAuth2ProviderRecipe.getInstanceOrThrowError();
    });
});
