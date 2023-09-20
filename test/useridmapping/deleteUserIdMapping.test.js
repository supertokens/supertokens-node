const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`deleteUserIdMappingTest: ${printPath("[test/useridmapping/deleteUserIdMapping.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("deleteUserIdMapping:", () => {
        it("delete an unknown userId mapping", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            {
                let response = await STExpress.deleteUserIdMapping({ userId: "unknown", userIdType: "SUPERTOKENS" });
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }

            {
                let response = await STExpress.deleteUserIdMapping({ userId: "unknown", userIdType: "EXTERNAL" });
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }

            {
                let response = await STExpress.deleteUserIdMapping({ userId: "unknown", userIdType: "ANY" });
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }
        });

        it("delete a userId mapping with userIdType as SUPERTOKENS", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalIdInfo = "externalIdInfo";

            // create the userId mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

            // delete the mapping
            let deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
                userId: superTokensUserId,
                userIdType: "SUPERTOKENS",
            });

            assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
            assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
            assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await STExpress.getUserIdMapping({
                    userId: superTokensUserId,
                    userIdType: "SUPERTOKENS",
                });
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("delete a userId mapping with userIdType as EXTERNAL", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalUserIdInfo = "externalIdInfo";

            // create the userId mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalUserIdInfo);

            // delete the mapping
            let deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
                userId: externalId,
                userIdType: "EXTERNAL",
            });

            assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
            assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
            assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await STExpress.getUserIdMapping({
                    userId: externalId,
                    userIdType: "EXTERNAL",
                });
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("delete a userId mapping with userIdType as ANY", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalIdInfo = "externalIdInfo";

            // create the userId mapping
            {
                await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

                // delete the mapping with the supertokensUserId and ANY
                let deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
                    userId: superTokensUserId,
                    userIdType: "ANY",
                });

                assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
                assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
                assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);
            }

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await STExpress.getUserIdMapping({
                    userId: superTokensUserId,
                    userIdType: "ANY",
                });
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }

            // create the mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

            // delete the mapping with externalId and ANY
            {
                let deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
                    userId: externalId,
                    userIdType: "ANY",
                });

                assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
                assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
                assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);
            }

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await STExpress.getUserIdMapping({
                    userId: externalId,
                    userIdType: "ANY",
                });
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("delete a userId mapping when userMetadata exists with externalId with and without force", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), UserMetadataRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user and map their userId
            let signUpResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalIdInfo = "test";

            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

            // add metadata to the user
            const testMetadata = {
                role: "admin",
            };
            await UserMetadataRecipe.updateUserMetadata(externalId, testMetadata);

            // delete UserIdMapping without passing force
            {
                try {
                    await STExpress.deleteUserIdMapping({
                        userId: externalId,
                        userIdType: "EXTERNAL",
                    });
                    throw new Error("Should not come here");
                } catch (error) {
                    assert(error.message.includes("UserId is already in use in UserMetadata recipe"));
                }
            }

            // try deleting mapping with force set to false
            {
                try {
                    await STExpress.deleteUserIdMapping({
                        userId: externalId,
                        userIdType: "EXTERNAL",
                        force: false,
                    });
                    throw new Error("Should not come here");
                } catch (error) {
                    assert(error.message.includes("UserId is already in use in UserMetadata recipe"));
                }
            }

            // delete mapping with force set to true
            {
                let deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
                    userId: externalId,
                    userIdType: "EXTERNAL",
                    force: true,
                });
                assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
                assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
                assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);
            }
        });
    });

    async function createUserIdMappingAndCheckThatItExists(superTokensUserId, externalUserId, externalUserIdInfo) {
        {
            let response = await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId,
                externalUserIdInfo,
            });
            assert.strictEqual(response.status, "OK");
        }

        {
            let response = await STExpress.getUserIdMapping({ userId: superTokensUserId, userIdType: "SUPERTOKENS" });
            assert.strictEqual(response.status, "OK");
            assert.strictEqual(response.superTokensUserId, superTokensUserId);
            assert.strictEqual(response.externalUserId, externalUserId);
            assert.strictEqual(response.externalUserIdInfo, externalUserIdInfo);
        }
    }
});
