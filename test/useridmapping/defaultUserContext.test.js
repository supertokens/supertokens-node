const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../lib/build/recipe/session").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { response } = require("@loopback/rest");

describe(`defaultUserContextTest: ${printPath("[test/useridmapping/defaultUserContext.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("defaultUserContext", () => {
        it("create a user, map their userId, check that if a function calls getUserIdMapping, the next function in that chain will have userIdMapping in the UserContext", async function () {
            await startST();

            let doesUserContextContainUserIdMapping = false;
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
                    EmailPasswordRecipe.init({
                        override: {
                            functions: (oI) => {
                                return {
                                    ...oI,
                                    getUserById: async function (input) {
                                        let response = await oI.getUserById(input);

                                        // call another function which uses getUserIdMapping
                                        await EmailPasswordRecipe.getUserByEmail("test@example.com", input.userContext);

                                        return response;
                                    },
                                    getUserByEmail: async function (input) {
                                        if (input.userContext._default.userIdMapping !== undefined) {
                                            doesUserContextContainUserIdMapping = true;
                                        }

                                        return await oI.getUserByEmail(input);
                                    },
                                };
                            },
                        },
                    }),
                    UserIdMappingRecipe.init(),
                    SessionRecipe.init(),
                ],
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
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId, externalIdInfo);
            let response = await EmailPasswordRecipe.getUserById(externalId);
            assert.strictEqual(response.id, externalId);
            assert.ok(doesUserContextContainUserIdMapping);
        });
    });
});
