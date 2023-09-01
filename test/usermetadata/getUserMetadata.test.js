const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const STExpress = require("../../");
const { ProcessState } = require("../../lib/build/processState");
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`getUserMetadataTest: ${printPath("[test/usermetadata/getUserMetadata.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("getUserMetadata", () => {
        it("should return an empty object for unknown userIds", async function () {
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

            const result = await UserMetadataRecipe.getUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");
            assert.deepStrictEqual(result.metadata, {});
        });

        it("should return an object if it's created.", async function () {
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

            const result = await UserMetadataRecipe.getUserMetadata(testUserId);

            assert.strictEqual(result.status, "OK");
            assert.deepStrictEqual(result.metadata, testMetadata);
        });
    });
});
