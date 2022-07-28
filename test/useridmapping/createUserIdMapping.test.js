const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserIdMappingRecipe = require("../../lib/build/recipe/useridmapping").default;
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`createUserIdMappingTest: ${printPath("[test/useridmapping/createUserIdMapping.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createUserIdMappingTest", () => {
        it("create a userId mapping", async function () {
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

            // check that the userId mapping exists
            let getUserIdMappingResponse = await UserIdMappingRecipe.getUserIdMapping(superTokensUserId, "SUPERTOKENS");
            assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
            assert.strictEqual(getUserIdMappingResponse.status, "OK");
            assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
            assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId);
            assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo);
        });

        it("create a userId mapping with an unknown superTokensUserId", async function () {
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

            // create the userId mapping
            let createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                "unknownuUserId",
                "externalId",
                "externalInfo"
            );
            assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
            assert.strictEqual(createUserIdMappingResponse.status, "UNKNOWN_SUPERTOKENS_USER_ID_ERROR");
        });

        it("create a userId mapping when a mapping already exists", async function () {
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

            // create a UserId mapping

            const signInResponse = await EmailPasswordRecipe.signUp("test@example.com", "testPass123");
            assert.strictEqual(signInResponse.status, "OK");

            const superTokensUserId = signInResponse.user.id;
            const externalId = "externalId";
            {
                const createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                    superTokensUserId,
                    externalId
                );
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
                assert.strictEqual(createUserIdMappingResponse.status, "OK");
            }

            // create a duplicate mapping where both superTokensUserId and externalId already exist
            {
                const createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                    superTokensUserId,
                    externalId
                );
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, true);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, true);
            }

            // create a duplicate mapping where both superTokensUserId already exists
            {
                const createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                    superTokensUserId,
                    "newExternalUserId"
                );
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, true);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, false);
            }

            // create a duplicate mapping where both externalUserId already exists
            {
                const newUserSignInReponse = await EmailPasswordRecipe.signUp("testnew@example.com", "testPass123");
                assert.strictEqual(newUserSignInReponse.status, "OK");

                const createUserIdMappingResponse = await UserIdMappingRecipe.createUserIdMapping(
                    newUserSignInReponse.user.id,
                    externalId
                );
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, false);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, true);
            }
        });
    });
});
