const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserIdMappingRecipe = require("../../lib/build/recipe/useridmapping").default;
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`getUserIdMappingTest: ${printPath("[test/useridmapping/getUserIdMapping.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("getUserIdMappingTest", () => {
        it("get userId mapping", async function () {
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
            let createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                superTokensUserId,
                externalId,
                externalIdInfo
            );
            assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
            assert.strictEqual(createUserIdMappingResponse.status, "OK");

            // check that the userId mapping exists with userIdType as SUPERTOKENS
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(
                    superTokensUserId,
                    "SUPERTOKENS"
                );
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
                assert.strictEqual(getUserIdMappingResponse.status, "OK");
                assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo);
            }

            // check that userId mapping exists with userIdType as EXTERNAL
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId, "ANY");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
                assert.strictEqual(getUserIdMappingResponse.status, "OK");
                assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo);
            }

            // check that userId mapping exists without passing userIdType
            {
                // while using the superTokensUserId
                {
                    let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(superTokensUserId);
                    assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
                    assert.strictEqual(getUserIdMappingResponse.status, "OK");
                    assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo);
                }

                // while using the externalUserId
                {
                    let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId);
                    assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
                    assert.strictEqual(getUserIdMappingResponse.status, "OK");
                    assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo);
                }
            }
        });

        it("get userId mapping when mapping does not exist", async function () {
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
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(
                    "unknownUserId",
                    "SUPERTOKENS"
                );
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }

            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping("unknownUserId", "EXTERNAL");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }

            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping("unknownUserId");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1);
                assert.strictEqual(getUserIdMappingResponse.status, "UNKNOWN_MAPPING_ERROR");
            }
        });

        it("get userId mapping when externalUserIdInfo does not exist", async function () {
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

            // create the userId mapping
            let createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                superTokensUserId,
                externalId
            );
            assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
            assert.strictEqual(createUserIdMappingResponse.status, "OK");

            // with userIdType as SUPERTOKENS
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(
                    superTokensUserId,
                    "SUPERTOKENS"
                );
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3);
                assert.strictEqual(getUserIdMappingResponse.status, "OK");
                assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
            }

            // with userIdType as EXTERNAL
            {
                let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId, "EXTERNAL");
                assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3);
                assert.strictEqual(getUserIdMappingResponse.status, "OK");
                assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
            }

            // without userIdType
            {
                // with supertokensUserId
                {
                    let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(superTokensUserId);
                    assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3);
                    assert.strictEqual(getUserIdMappingResponse.status, "OK");
                    assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                }

                // with externalUserId
                {
                    let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(externalId);
                    assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3);
                    assert.strictEqual(getUserIdMappingResponse.status, "OK");
                    assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
                    assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
                }
            }
        });
    });
});
