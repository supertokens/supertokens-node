const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const UserIdMappingRecipe = require("../../../lib/build/recipe/useridmapping").default;
const EmailPasswordRecipe = require("../../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");
const { default: SuperTokens } = require("../../../lib/build/supertokens");

describe(`userIdMapping with emailpassword: ${printPath(
    "[test/useridmapping/recipeTests/emailpassword.test.js]"
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

    describe("deleteUser", () => {
        it("create an emailPassword user and map their userId, then delete user with the externalId", async function () {
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
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp(email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await EmailPasswordRecipe.getUserById(superTokensUserId);
                assert.strictEqual(response.id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId);

            // retrieve the users info using the superTokensUserId, the id in the response should be the externalId
            {
                let response = await EmailPasswordRecipe.getUserById(superTokensUserId);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
                assert.strictEqual(response.email, email);
            }

            {
                const response = await STExpress.deleteUser(externalId);
                assert.strictEqual(response.status, "OK");
            }

            // check that user does not exist
            {
                let response = await EmailPasswordRecipe.getUserById(superTokensUserId);
                assert.ok(response === undefined);
            }
        });
    });
});
