const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`clearUserMetadataTest: ${printPath("[test/usermetadata/clearUserMetadata.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("clearUserMetadata", () => {
        it("should return OK for unknown user id", async function () {
            const connectionURI = await startST();

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

            // Only run for version >= 2.13
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return this.skip();
            }

            const result = await UserMetadataRecipe.clearUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");
        });

        it("should clear stored userId", async function () {
            const connectionURI = await startST();

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

            // Only run for version >= 2.13
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return this.skip();
            }
            await UserMetadataRecipe.updateUserMetadata(testUserId, testMetadata);

            const result = await UserMetadataRecipe.clearUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");

            const getResult = await UserMetadataRecipe.getUserMetadata(testUserId);

            assert.strictEqual(getResult.status, "OK");
            assert.deepStrictEqual(getResult.metadata, {});
        });
    });
});
