const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const ThirdPartyPasswordlessRecipe = require("../../../lib/build/recipe/thirdpartypasswordless").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

describe(`userIdMapping with thirdPartyPasswordless: ${printPath(
    "[test/useridmapping/recipeTests/thirdpartypasswordless.test.js]"
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
        it("create a thirdParty and passwordless user and map their userIds, retrieve the user info using getUserById and check that the externalId is returned", async function () {
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
                    ThirdPartyPasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                        smsDelivery: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
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
                const email = "test2@example.com";
                // create a new ThirdParty user
                let signUpResponse = await ThirdPartyPasswordlessRecipe.thirdPartyManuallyCreateOrUpdateUser(
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

                // retrieve the user info using the externalId, the id in the response should be the externalId
                {
                    let response = await STExpress.getUser(superTokensUserId);
                    assert.ok(response !== undefined);
                    assert.strictEqual(response.id, externalId);
                    assert.strictEqual(response.emails[0], email);
                }
            }

            {
                // create a Passwordless user
                const phoneNumber = "+911234566789";
                const codeInfo = await ThirdPartyPasswordlessRecipe.createCode({
                    tenantId: "public",
                    phoneNumber,
                });

                assert.strictEqual(codeInfo.status, "OK");

                const consumeCodeResponse = await ThirdPartyPasswordlessRecipe.consumeCode({
                    tenantId: "public",
                    preAuthSessionId: codeInfo.preAuthSessionId,
                    userInputCode: codeInfo.userInputCode,
                    deviceId: codeInfo.deviceId,
                });

                assert.strictEqual(consumeCodeResponse.status, "OK");

                const superTokensUserId = consumeCodeResponse.user.id;
                const externalId = "psExternalId";

                // create the userIdMapping
                await STExpress.createUserIdMapping({
                    superTokensUserId,
                    externalUserId: externalId,
                });

                // retrieve the user info using the externalId, the id in the response should be the externalId
                let response = await STExpress.getUser(externalId);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
            }
        });
    });
});
