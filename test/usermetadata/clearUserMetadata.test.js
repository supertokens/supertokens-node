const assert = require("assert");

const { printPath, createCoreApplication } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`clearUserMetadataTest: ${printPath("[test/usermetadata/clearUserMetadata.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    describe("clearUserMetadata", () => {
        it("should return OK for unknown user id", async function () {
            const connectionURI = await createCoreApplication();

            const testUserId = "userId";

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

            const result = await UserMetadataRecipe.clearUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");
        });

        it("should clear stored userId", async function () {
            const connectionURI = await createCoreApplication();

            const testUserId = "userId";
            const testMetadata = {
                role: "admin",
            };

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

            await UserMetadataRecipe.updateUserMetadata(testUserId, testMetadata);

            const result = await UserMetadataRecipe.clearUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");

            const getResult = await UserMetadataRecipe.getUserMetadata(testUserId);

            assert.strictEqual(getResult.status, "OK");
            assert.deepStrictEqual(getResult.metadata, {});
        });
    });
});
