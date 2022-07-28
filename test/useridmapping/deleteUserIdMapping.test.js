const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserIdMappingRecipe = require("../../lib/build/recipe/useridmapping").default;
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
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
                recipeList: [EmailPasswordRecipe.init(), UserIdMappingRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            {
                let response = await UserIdMappingRecipe.deleteUserIdMapping("unknown", "SUPERTOKENS");
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }

            {
                let response = await UserIdMappingRecipe.deleteUserIdMapping("unknown", "EXTERNAL");
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }

            {
                let response = await UserIdMappingRecipe.deleteUserIdMapping("unknown", "ANY");
                assert.strictEqual(Object.keys(response).length, 2);
                assert.strictEqual(response.status, "OK");
                assert.strictEqual(response.didMappingExist, false);
            }
        });

        it("delete a userId mapping with userIdType as SUPERTOKENS", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), UserIdMappingRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalIdInfo = "externalIdInfo";

            // create the userId mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

            // delete the mapping
            let deleteUserIdMappingResponse = await UserIdMappingRecipe.deleteUserIdMapping(
                superTokensUserId,
                "SUPERTOKENS"
            );

            assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
            assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
            assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(
                    superTokensUserId,
                    "SUPERTOKENS"
                );
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("delete a userId mapping with userIdType as EXTERNAL", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), UserIdMappingRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalUserIdInfo = "externalIdInfo";

            // create the userId mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalUserIdInfo);

            // delete the mapping
            let deleteUserIdMappingResponse = await UserIdMappingRecipe.deleteUserIdMapping(externalId, "EXTERNAL");

            assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
            assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
            assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId, "EXTERNAL");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("delete a userId mapping with userIdType as ANY", async function () {
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
                recipeList: [EmailPasswordRecipe.init(), UserIdMappingRecipe.init(), SessionRecipe.init()],
            });

            // Only run for version >= 2.15
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a user
            let signUpResponse = await EmailPasswordRecipe.signUp("test@example.com", "testPass123");
            assert.strictEqual(signUpResponse.status, "OK");

            let superTokensUserId = signUpResponse.user.id;
            let externalId = "externalId";
            let externalIdInfo = "externalIdInfo";

            // create the userId mapping
            {
                await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

                // delete the mapping with the supertokensUserId and ANY
                let deleteUserIdMappingResponse = await UserIdMappingRecipe.deleteUserIdMapping(
                    superTokensUserId,
                    "ANY"
                );

                assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
                assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
                assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);
            }

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(superTokensUserId, "ANY");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }

            // create the mapping
            await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo);

            // delete the mapping with externalId and ANY
            {
                let deleteUserIdMappingResponse = await UserIdMappingRecipe.deleteUserIdMapping(externalId, "ANY");

                assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2);
                assert.strictEqual(deleteUserIdMappingResponse.status, "OK");
                assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true);
            }

            // check that the mapping is deleted
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId, "ANY");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });
    });

    async function createUserIdMappingAndCheckThatItExists(superTokensUserId, externalUserId, externalUserIdInfo) {
        {
            let response = await UserIdMappingRecipe.createUserIdMapping(
                superTokensUserId,
                externalUserId,
                externalUserIdInfo
            );
            assert.strictEqual(response.status, "OK");
        }

        {
            let response = await UserIdMappingRecipe.getUserIdMapping(superTokensUserId, "SUPERTOKENS");
            assert.strictEqual(response.status, "OK");
            assert.strictEqual(response.superTokensUserId, superTokensUserId);
            assert.strictEqual(response.externalUserId, externalUserId);
            assert.strictEqual(response.externalUserIdInfo, externalUserIdInfo);
        }
    }
});
