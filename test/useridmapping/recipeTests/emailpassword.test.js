const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const UserIdMappingRecipe = require("../../../lib/build/recipe/useridmapping").default;
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

            // retrieve the users info using the externalId, the id in the response should be the externalId
            {
                let response = await EmailPasswordRecipe.getUserById(superTokensUserId);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
                assert.strictEqual(response.email, email);
            }
        });
    });

    describe("getUserByEmail", () => {
        it("create an emailPassword user and map their userId, retrieve the user info using getUserByEmail and check that the externalId is returned", async function () {
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
                let response = await EmailPasswordRecipe.getUserByEmail(email);
                assert.strictEqual(response.id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId);

            // retrieve the users info using email, the id in the response should be the externalId
            {
                let response = await EmailPasswordRecipe.getUserByEmail(email);
                assert.ok(response !== undefined);
                assert.strictEqual(response.id, externalId);
                assert.strictEqual(response.email, email);
            }
        });
    });

    describe("signIn", () => {
        it("create an emailPassword user and map their userId, signIn, check that the userRetrieved has the mapped userId", async function () {
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
                let response = await EmailPasswordRecipe.getUserByEmail(email);
                assert.strictEqual(response.id, superTokensUserId);
            }

            let externalId = "externalId";

            // map the users id
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId);

            // sign in, check that the userId retrieved is the external userId
            let signInResponse = await EmailPasswordRecipe.signIn(email, password);
            assert.strictEqual(signInResponse.status, "OK");
            assert.strictEqual(signInResponse.user.id, externalId);
        });
    });

    describe("password reset", () => {
        it("create an emailPassword user and map their userId, and do a password reset using the external id, check that it gets reset", async function () {
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
                let response = await EmailPasswordRecipe.getUserByEmail(email);
                assert.strictEqual(response.id, superTokensUserId);
            }

            // map the userId
            const externalId = "externalId";
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId);
            // create the password resestToken
            let createResetPasswordTokenResponse = await EmailPasswordRecipe.createResetPasswordToken(externalId);
            assert.strictEqual(createResetPasswordTokenResponse.status, "OK");

            // reset the password
            const newPassword = "newTestPass123";
            let resetPasswordUsingTokenResponse = await EmailPasswordRecipe.resetPasswordUsingToken(
                createResetPasswordTokenResponse.token,
                newPassword
            );
            assert.strictEqual(resetPasswordUsingTokenResponse.status, "OK");
            assert.strictEqual(resetPasswordUsingTokenResponse.userId, externalId);

            // check that the password is reset by signing in
            let response = await EmailPasswordRecipe.signIn(email, newPassword);
            assert.strictEqual(response.status, "OK");
            assert.strictEqual(response.user.id, externalId);
        });
    });

    describe("update email and password", () => {
        it("create an emailPassword user and map their userId, update their email and password using the externalId", async function () {
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
                let response = await EmailPasswordRecipe.getUserByEmail(email);
                assert.strictEqual(response.id, superTokensUserId);
            }

            // map the userId
            const externalId = "externalId";
            await UserIdMappingRecipe.createUserIdMapping(superTokensUserId, externalId);

            // update the email using the externalId
            const updatedEmail = "test123@example.com";
            {
                {
                    const response = await EmailPasswordRecipe.updateEmailOrPassword({
                        userId: externalId,
                        email: updatedEmail,
                    });
                    assert.strictEqual(response.status, "OK");
                }

                // sign in with the new email
                {
                    const response = await EmailPasswordRecipe.signIn(updatedEmail, password);
                    assert.strictEqual(response.status, "OK");
                    assert.strictEqual(response.user.id, externalId);
                }
            }

            // update the password using the externalId
            const updatedPassword = "newTestPass123";
            {
                {
                    const response = await EmailPasswordRecipe.updateEmailOrPassword({
                        userId: externalId,
                        password: updatedPassword,
                    });
                    assert.strictEqual(response.status, "OK");
                }

                // sign in with new password
                {
                    const response = await EmailPasswordRecipe.signIn(updatedEmail, updatedPassword);
                    assert.strictEqual(response.status, "OK");
                    assert.strictEqual(response.user.id, externalId);
                }
            }
        });
    });
});
