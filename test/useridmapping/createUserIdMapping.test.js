const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
const UserMetadataRecipe = require("../../lib/build/recipe/usermetadata").default;
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
            let externalUserId = "externalId";
            let externalUserIdInfo = "externalIdInfo";

            // create the userId mapping
            let createUserIdMappingResponse = await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId,
                externalUserIdInfo,
            });
            assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
            assert.strictEqual(createUserIdMappingResponse.status, "OK");

            // check that the userId mapping exists
            let getUserIdMappingResponse = await STExpress.getUserIdMapping({
                userId: superTokensUserId,
                userIdType: "SUPERTOKENS",
            });
            assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4);
            assert.strictEqual(getUserIdMappingResponse.status, "OK");
            assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId);
            assert.strictEqual(getUserIdMappingResponse.externalUserId, externalUserId);
            assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalUserIdInfo);
        });

        it("create a userId mapping with an unknown superTokensUserId", async function () {
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

            // create the userId mapping
            let createUserIdMappingResponse = await STExpress.createUserIdMapping({
                superTokensUserId: "unknownuUserId",
                externalUserId: "externalId",
                externalUserIdInfo: "externalInfo",
            });
            assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
            assert.strictEqual(createUserIdMappingResponse.status, "UNKNOWN_SUPERTOKENS_USER_ID_ERROR");
        });

        it("create a userId mapping when a mapping already exists", async function () {
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

            // create a UserId mapping

            const signInResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signInResponse.status, "OK");

            const superTokensUserId = signInResponse.user.id;
            const externalId = "externalId";
            {
                const createUserIdMappingResponse = await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: externalId,
                });
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1);
                assert.strictEqual(createUserIdMappingResponse.status, "OK");
            }

            // create a duplicate mapping where both superTokensUserId and externalId already exist
            {
                const createUserIdMappingResponse = await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: externalId,
                });
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, true);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, true);
            }

            // create a duplicate mapping where both superTokensUserId already exists
            {
                const createUserIdMappingResponse = await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: "newExternalUserId",
                });
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, true);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, false);
            }

            // create a duplicate mapping where both externalUserId already exists
            {
                const newUserSignInResponse = await EmailPasswordRecipe.signUp(
                    "public",
                    "testnew@example.com",
                    "testPass123"
                );
                assert.strictEqual(newUserSignInResponse.status, "OK");

                const createUserIdMappingResponse = await STExpress.createUserIdMapping({
                    superTokensUserId: newUserSignInResponse.user.id,
                    externalUserId: externalId,
                });
                assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 3);
                assert.strictEqual(createUserIdMappingResponse.status, "USER_ID_MAPPING_ALREADY_EXISTS_ERROR");
                assert.strictEqual(createUserIdMappingResponse.doesSuperTokensUserIdExist, false);
                assert.strictEqual(createUserIdMappingResponse.doesExternalUserIdExist, true);
            }
        });

        it("create a userId mapping when userId already has usermetadata with and without force", async function () {
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

            // create a user

            const signInResponse = await EmailPasswordRecipe.signUp("public", "test@example.com", "testPass123");
            assert.strictEqual(signInResponse.status, "OK");
            const superTokensUserId = signInResponse.user.id;

            // add metadata to the user
            const testMetadata = {
                role: "admin",
            };
            await UserMetadataRecipe.updateUserMetadata(superTokensUserId, testMetadata);

            const externalId = "externalId";
            // without force
            {
                try {
                    await STExpress.createUserIdMapping({
                        superTokensUserId,
                        externalUserId: externalId,
                    });
                    throw new Error("Should not come here");
                } catch (error) {
                    assert(error.message.includes("UserId is already in use in UserMetadata recipe"));
                }
            }
            // with force set to false
            {
                try {
                    await STExpress.createUserIdMapping({
                        superTokensUserId,
                        externalUserId: externalId,
                        force: false,
                    });
                    throw new Error("Should not come here");
                } catch (error) {
                    assert(error.message.includes("UserId is already in use in UserMetadata recipe"));
                }
            }
            // with force set to true
            {
                {
                    let response = await STExpress.createUserIdMapping({
                        superTokensUserId,
                        externalUserId: externalId,
                        force: true,
                    });
                    assert.strictEqual(response.status, "OK");
                }

                // check that mapping exists
                {
                    let response = await STExpress.getUserIdMapping({
                        userId: superTokensUserId,
                        userIdType: "SUPERTOKENS",
                    });
                    assert.strictEqual(response.status, "OK");
                    assert.strictEqual(response.superTokensUserId, superTokensUserId);
                    assert.strictEqual(response.externalUserId, externalId);
                }
            }
        });
    });
});
