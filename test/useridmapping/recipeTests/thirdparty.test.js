const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const ThirdPartyRecipe = require("../../../lib/build/recipe/thirdparty").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

describe(`userIdMapping with thirdparty: ${printPath(
    "[test/useridmapping/recipeTests/thirdparty.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("signInUp", () => {
        it("create a thirdParty user and map their userId, signIn and check that the externalId is returned", async function () {
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
                recipeList: [
                    ThirdPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdPartyRecipe.Google({
                                    clientId: "test",
                                    clientSecret: "test",
                                }),
                            ],
                        },
                    }),
                    SessionRecipe.init(),
                ],
            });

            // Only run for version >= 2.15
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a thirdParty user
            let signInUpResponse = await ThirdPartyRecipe.signInUp("google", "tpId", {
                id: "test@example.com",
                isVerified: true,
            });

            assert.strictEqual(signInUpResponse.status, "OK");
            const superTokensUserId = signInUpResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // sign in and check that the userId in the response is the externalId
            let response = await ThirdPartyRecipe.signInUp("google", "tpId", {
                id: "test@example.com",
                isVerified: true,
            });

            assert.strictEqual(response.status, "OK");
            assert.strictEqual(response.createdNewUser, false);
            assert.strictEqual(response.user.id, externalId);
        });
    });

    describe("getUserById", () => {
        it("create a thirdParty user and map their userId, retrieve the user info using getUserById and check that the externalId is returned", async function () {
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
                recipeList: [
                    ThirdPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdPartyRecipe.Google({
                                    clientId: "test",
                                    clientSecret: "test",
                                }),
                            ],
                        },
                    }),
                    SessionRecipe.init(),
                ],
            });

            // Only run for version >= 2.15
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a thirdParty user
            let signInUpResponse = await ThirdPartyRecipe.signInUp("google", "tpId", {
                id: "test@example.com",
                isVerified: true,
            });

            assert.strictEqual(signInUpResponse.status, "OK");
            const superTokensUserId = signInUpResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve the user
            let response = await ThirdPartyRecipe.getUserById(externalId);
            assert.ok(response != undefined);
            assert.strictEqual(response.id, externalId);
        });
    });

    describe("getUsersByEmail", () => {
        it("create a thirdParty user and map their userId, retrieve the user info using getUsersByEmail and check that the externalId is returned", async function () {
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
                recipeList: [
                    ThirdPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdPartyRecipe.Google({
                                    clientId: "test",
                                    clientSecret: "test",
                                }),
                            ],
                        },
                    }),
                    SessionRecipe.init(),
                ],
            });

            // Only run for version >= 2.15
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a thirdParty user
            let signInUpResponse = await ThirdPartyRecipe.signInUp("google", "tpId", {
                id: "test@example.com",
                isVerified: true,
            });

            assert.strictEqual(signInUpResponse.status, "OK");
            const superTokensUserId = signInUpResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve the user
            let response = await ThirdPartyRecipe.getUsersByEmail("test@example.com");
            assert.strictEqual(response.length, 1);
            assert.strictEqual(response[0].id, externalId);
        });
    });

    describe("getUserByThirdPartyInfo", () => {
        it("create a thirdParty user and map their userId, retrieve the user info using getUserByThirdPartyInfo and check that the externalId is returned", async function () {
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
                recipeList: [
                    ThirdPartyRecipe.init({
                        signInAndUpFeature: {
                            providers: [
                                ThirdPartyRecipe.Google({
                                    clientId: "test",
                                    clientSecret: "test",
                                }),
                            ],
                        },
                    }),
                    SessionRecipe.init(),
                ],
            });

            // Only run for version >= 2.15
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a thirdParty user
            const thirdPartyId = "google";
            const thirdPartyUserId = "tpId";
            let signInUpResponse = await ThirdPartyRecipe.signInUp(thirdPartyId, thirdPartyUserId, {
                id: "test@example.com",
                isVerified: true,
            });

            assert.strictEqual(signInUpResponse.status, "OK");
            const superTokensUserId = signInUpResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve the user
            let response = await ThirdPartyRecipe.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
            assert.ok(response != undefined);
            assert.strictEqual(response.id, externalId);
        });
    });
});
