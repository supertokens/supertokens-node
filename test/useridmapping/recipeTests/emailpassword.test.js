const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const EmailPasswordRecipe = require("../../../lib/build/recipe/emailpassword").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

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

    describe("getUserById", () => {
        it("create an emailPassword user and map their userId, retrieve the user info using getUserById and check that the externalId is returned", async function () {
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

            // retrieve the users info using the externalId, the id in the response should be the externalId
            {
                let response = await STExpress.getUser(externalId);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
                assert.strictEqual(response.emails[0], email);
            }
        });
    });

    describe("getUserByEmail", () => {
        it("create an emailPassword user and map their userId, retrieve the user info using getUserByEmail and check that the externalId is returned", async function () {
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

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp("public", email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await STExpress.listUsersByAccountInfo("public", { email });
                assert.strictEqual(response[0].id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // retrieve the users info using email, the id in the response should be the externalId
            {
                let response = await STExpress.listUsersByAccountInfo("public", { email });
                assert.ok(response !== undefined);
                assert.strictEqual(response[0].id, externalId);
                assert.strictEqual(response[0].emails[0], email);
            }
        });
    });

    describe("signIn", () => {
        it("create an emailPassword user and map their userId, signIn, check that the userRetrieved has the mapped userId", async function () {
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

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp("public", email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await STExpress.listUsersByAccountInfo("public", { email });
                assert.strictEqual(response[0].id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // sign in, check that the userId retrieved is the external userId
            let signInResponse = await EmailPasswordRecipe.signIn("public", email, password);
            assert.strictEqual(signInResponse.status, "OK");
            assert.strictEqual(signInResponse.user.id, externalId);
        });
    });

    describe("password reset", () => {
        it("create an emailPassword user and map their userId, and do a password reset using the external id, check that it gets reset", async function () {
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

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp("public", email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await STExpress.listUsersByAccountInfo("public", { email });
                assert.strictEqual(response[0].id, superTokensUserId);
            }

            // map the userId
            const externalId = "externalId";
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });
            // create the password resestToken
            let createResetPasswordTokenResponse = await EmailPasswordRecipe.createResetPasswordToken(
                "public",
                externalId,
                email
            );
            assert.strictEqual(createResetPasswordTokenResponse.status, "OK");

            // reset the password
            const newPassword = "newTestPass123";
            let resetPasswordUsingTokenResponse = await EmailPasswordRecipe.consumePasswordResetToken(
                "public",
                createResetPasswordTokenResponse.token
            );
            assert.strictEqual(resetPasswordUsingTokenResponse.status, "OK");
            assert.strictEqual(resetPasswordUsingTokenResponse.userId, externalId);

            let resp = await EmailPasswordRecipe.updateEmailOrPassword({
                recipeUserId: STExpress.convertToRecipeUserId(externalId),
                password: newPassword,
            });
            assert.strictEqual(resp.status, "OK");

            // check that the password is reset by signing in
            let response = await EmailPasswordRecipe.signIn("public", email, newPassword);
            assert.strictEqual(response.status, "OK");
            assert.strictEqual(response.user.id, externalId);
        });
    });

    describe("update email and password", () => {
        it("create an emailPassword user and map their userId, update their email and password using the externalId", async function () {
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

            // create a new EmailPassword User
            const email = "test@example.com";
            const password = "testPass123";

            let signUpResponse = await EmailPasswordRecipe.signUp("public", email, password);
            assert.strictEqual(signUpResponse.status, "OK");
            let user = signUpResponse.user;
            let superTokensUserId = user.id;

            // retrieve the users info, the id should be the superTokens userId
            {
                let response = await STExpress.listUsersByAccountInfo("public", { email });
                assert.strictEqual(response[0].id, superTokensUserId);
            }

            // map the userId
            const externalId = "externalId";
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // update the email using the externalId
            const updatedEmail = "test123@example.com";
            {
                {
                    const response = await EmailPasswordRecipe.updateEmailOrPassword({
                        recipeUserId: STExpress.convertToRecipeUserId(externalId),
                        email: updatedEmail,
                    });
                    assert.strictEqual(response.status, "OK");
                }

                // sign in with the new email
                {
                    const response = await EmailPasswordRecipe.signIn("public", updatedEmail, password);
                    assert.strictEqual(response.status, "OK");
                    assert.strictEqual(response.user.id, externalId);
                }
            }

            // update the password using the externalId
            const updatedPassword = "newTestPass123";
            {
                {
                    const response = await EmailPasswordRecipe.updateEmailOrPassword({
                        recipeUserId: STExpress.convertToRecipeUserId(externalId),
                        password: updatedPassword,
                    });
                    assert.strictEqual(response.status, "OK");
                }

                // sign in with new password
                {
                    const response = await EmailPasswordRecipe.signIn("public", updatedEmail, updatedPassword);
                    assert.strictEqual(response.status, "OK");
                    assert.strictEqual(response.user.id, externalId);
                }
            }
        });
    });
});
