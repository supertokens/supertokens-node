const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const STExpress = require("../../");
const { ProcessState } = require("../../lib/build/processState");
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`overrideTest: ${printPath("[test/usermetadata/override.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("recipe functions", () => {
        it("should work without an override config", async function () {
            const connectionURI = await startST();

            const testUserId = "userId";
            const testUserContext = { hello: ":)" };
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

            const updateResult = await UserMetadataRecipe.updateUserMetadata(testUserId, testMetadata, testUserContext);
            const getResult = await UserMetadataRecipe.getUserMetadata(testUserId, testUserContext);
            const clearResult = await UserMetadataRecipe.clearUserMetadata(testUserId, testUserContext);

            assert.deepStrictEqual(updateResult.metadata, testMetadata);
            assert.deepStrictEqual(getResult.metadata, testMetadata);
            assert.deepStrictEqual(clearResult.status, "OK");
        });

        it("should call user provided overrides", async function () {
            const connectionURI = await startST();

            const testUserId = "userId";
            const testUserContext = { hello: ":)" };
            const testMetadata = {
                role: "admin",
            };

            let getUserMetadataResp = undefined;
            let updateUserMetadataResp = undefined;
            let clearUserMetadataResp = undefined;

            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    UserMetadataRecipe.init({
                        override: {
                            functions: (originalImplementation) => {
                                return {
                                    ...originalImplementation,
                                    getUserMetadata: async (input) => {
                                        assert.strictEqual(input.userId, testUserId);
                                        // This is intentionally strictEqual, we expect them to be the same object not a clone.
                                        assert.strictEqual(input.userContext, testUserContext);
                                        getUserMetadataResp = await originalImplementation.getUserMetadata(input);

                                        return getUserMetadataResp;
                                    },
                                    updateUserMetadata: async (input) => {
                                        assert.strictEqual(input.userId, testUserId);
                                        // These are intentionally strictEquals, we expect them to be the same object not a clone.
                                        assert.strictEqual(input.metadataUpdate, testMetadata);
                                        assert.strictEqual(input.userContext, testUserContext);
                                        updateUserMetadataResp = await originalImplementation.updateUserMetadata(input);

                                        return updateUserMetadataResp;
                                    },
                                    clearUserMetadata: async (input) => {
                                        assert.strictEqual(input.userId, testUserId);
                                        // This is intentionally strictEqual, we expect them to be the same object not a clone.
                                        assert.strictEqual(input.userContext, testUserContext);
                                        clearUserMetadataResp = await originalImplementation.clearUserMetadata(input);

                                        return clearUserMetadataResp;
                                    },
                                };
                            },
                        },
                    }),
                ],
            });

            // Only run for version >= 2.13
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return this.skip();
            }

            const updateResult = await UserMetadataRecipe.updateUserMetadata(testUserId, testMetadata, testUserContext);
            const getResult = await UserMetadataRecipe.getUserMetadata(testUserId, testUserContext);
            const clearResult = await UserMetadataRecipe.clearUserMetadata(testUserId, testUserContext);

            assert.deepStrictEqual(updateResult.metadata, testMetadata);
            // This is intentionally strictEqual, we expect them to be the same object not a clone.
            assert.strictEqual(updateUserMetadataResp, updateResult);

            assert.deepStrictEqual(getResult.metadata, testMetadata);
            // This is intentionally strictEqual, we expect them to be the same object not a clone.
            assert.strictEqual(getUserMetadataResp, getResult);

            assert.deepStrictEqual(clearResult.status, "OK");
            // This is intentionally strictEqual, we expect them to be the same object not a clone.
            assert.strictEqual(clearUserMetadataResp, clearResult);
        });
    });
});
