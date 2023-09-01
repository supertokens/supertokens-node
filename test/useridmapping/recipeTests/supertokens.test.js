const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const EmailPasswordRecipe = require("../../../lib/build/recipe/emailpassword").default;
const UserMetadataRecipe = require("../../../lib/build/recipe/usermetadata").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

describe(`userIdMapping with supertokens recipe: ${printPath(
    "[test/useridmapping/recipeTests/supertokens.test.js]"
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
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp("public", email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await STExpress.getUser(superTokensUserId);
                assert.strictEqual(response.id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve the users info using the superTokensUserId, the id in the response should be the externalId
            {
                let response = await STExpress.getUser(superTokensUserId);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
                assert.strictEqual(response.emails[0], email);
            }

            // add userMetadata to the user mapped with the externalId
            {
                const testMetadata = {
                    role: "admin",
                };
                await UserMetadataRecipe.updateUserMetadata(externalId, testMetadata);

                // retrieve UserMetadata and check that it exists
                let response = await UserMetadataRecipe.getUserMetadata(externalId);
                assert.strictEqual(response.status, "OK");
                assert.deepStrictEqual(response.metadata, testMetadata);
            }

            {
                const response = await STExpress.deleteUser(externalId);
                assert.strictEqual(response.status, "OK");
            }

            // check that user does not exist
            {
                let response = await STExpress.getUser(superTokensUserId);
                assert.ok(response === undefined);
            }
            // check that no metadata exists for the id
            {
                let response = await UserMetadataRecipe.getUserMetadata(externalId);
                assert.strictEqual(Object.keys(response.metadata).length, 0);
            }
        });
    });

    describe("getUsers", () => {
        it("create multiple users and map one of the users userId, retrieve all users and check that response will contain the externalId for the mapped user", async function () {
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
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.14") === "2.14") {
                return this.skip();
            }

            // create multiple users
            const email = ["test@example.com", "test1@example.com", "test2@example.com", "test3@example.com"];
            const password = "testPass123";
            let users = [];

            for (let i = 0; i < email.length; i++) {
                let signUpResponse = await EmailPasswordRecipe.signUp("public", email[i], password);
                assert.strictEqual(signUpResponse.status, "OK");
                users.push(signUpResponse.user);
            }

            // the first users userId
            const superTokensUserId = users[0].id;

            let externalId = "externalId";

            // map the users id
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve all the users using getUsersNewestFirst
            {
                let response = await STExpress.getUsersNewestFirst({ tenantId: "public" });
                assert.strictEqual(response.users.length, 4);
                // since the first user we created has their userId mapped we access the last element from the users array in the response
                const oldestUsersId = response.users[response.users.length - 1].id;
                assert.strictEqual(oldestUsersId, externalId);
            }

            // retrieve all the users using getUsersOldestFirst
            {
                let response = await STExpress.getUsersOldestFirst({ tenantId: "public" });
                assert.strictEqual(response.users.length, 4);

                const oldestUsersId = response.users[0].id;
                assert.strictEqual(oldestUsersId, externalId);
            }
        });
    });
});
