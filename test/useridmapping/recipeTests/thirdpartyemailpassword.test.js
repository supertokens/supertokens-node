const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const ThirdPartyEmailPasswordRecipe = require("../../../lib/build/recipe/thirdpartyemailpassword").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

describe(`userIdMapping with ThirdPartyEmailPassword: ${printPath(
    "[test/useridmapping/recipeTests/thirdpartyemailpassword.test.js]"
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

    describe("getUserById", () => {
        it("create an emailPassword a thirdParty user and map their userIds, retrieve the user info using getUserById and check that the externalId is returned", async function () {
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
                recipeList: [
                    ThirdPartyEmailPasswordRecipe.init({
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientId: "google",
                                            clientSecret: "test",
                                        },
                                    ],
                                },
                            },
                        ],
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

            {
                // create a new EmailPassword User
                const email = "test@example.com";
                const password = "testPass123";

                let signUpResponse = await ThirdPartyEmailPasswordRecipe.emailPasswordSignUp("public", email, password);
                assert.strictEqual(signUpResponse.status, "OK");
                let user = signUpResponse.user;
                let superTokensUserId = user.id;
                let externalId = "epExternalId";

                // map the users id
                await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: externalId,
                });

                // retrieve the users info using the externalId, the id in the response should be the externalId
                {
                    let response = await STExpress.getUser(superTokensUserId);
                    assert.ok(response !== undefined);
                    assert.strictEqual(response.id, externalId);
                    assert.strictEqual(response.emails[0], email);
                }
            }

            {
                // create a new ThirdParty user
                const email = "test2@example.com";

                let signUpResponse = await ThirdPartyEmailPasswordRecipe.thirdPartyManuallyCreateOrUpdateUser(
                    "public",
                    "google",
                    "tpId",
                    email,
                    false
                );

                // map the users id
                let user = signUpResponse.user;
                let superTokensUserId = user.id;
                let externalId = "tpExternalId";
                await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: externalId,
                });

                // retrieve the users info using the externalId, the id in the response should be the externalId
                {
                    let response = await STExpress.getUser(superTokensUserId);
                    assert.ok(response !== undefined);
                    assert.strictEqual(response.id, externalId);
                    assert.strictEqual(response.emails[0], email);
                }
            }
        });
    });
});
