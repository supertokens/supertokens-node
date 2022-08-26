const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
const { ProcessState } = require("../../../lib/build/processState");
const STExpress = require("../../..");
const PasswordlessRecipe = require("../../../lib/build/recipe/passwordless").default;
const SessionRecipe = require("../../../lib/build/recipe/session").default;
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

describe(`userIdMapping with passwordless: ${printPath(
    "[test/useridmapping/recipeTests/passwordless.test.js]"
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

    describe("consumeCode", () => {
        it("create a passwordless user and map their userId, signIn again and check that the externalId is returned", async function () {
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
                    PasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomEmail: (input) => {
                            return;
                        },
                        createAndSendCustomTextMessage: (input) => {
                            return;
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

            // create a Passwordless user
            const email = "test@example.com";
            const codeInfo = await PasswordlessRecipe.createCode({
                email,
            });

            assert.strictEqual(codeInfo.status, "OK");

            const consumeCodeResponse = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(consumeCodeResponse.status, "OK");

            const superTokensUserId = consumeCodeResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            // sign in again and check and the externalId is returned
            const codeInfo_2 = await PasswordlessRecipe.createCode({
                email,
            });

            assert.strictEqual(codeInfo_2.status, "OK");

            const consumeCodeResponse_2 = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo_2.preAuthSessionId,
                userInputCode: codeInfo_2.userInputCode,
                deviceId: codeInfo_2.deviceId,
            });

            assert.strictEqual(consumeCodeResponse_2.status, "OK");
            assert.strictEqual(consumeCodeResponse_2.user.id, externalId);
        });
    });

    describe("getUserById", () => {
        it("create a passwordless user and map their userId, call getUserById and check that the externalId is returned", async function () {
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
                    PasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomEmail: (input) => {
                            return;
                        },
                        createAndSendCustomTextMessage: (input) => {
                            return;
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

            // create a Passwordless user
            const email = "test@example.com";
            const codeInfo = await PasswordlessRecipe.createCode({
                email,
            });

            assert.strictEqual(codeInfo.status, "OK");

            const consumeCodeResponse = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(consumeCodeResponse.status, "OK");

            const superTokensUserId = consumeCodeResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            let response = await PasswordlessRecipe.getUserById({
                userId: externalId,
            });
            assert.ok(response !== undefined);
            assert.strictEqual(response.id, externalId);
        });
    });

    describe("getUserByEmail", () => {
        it("create a passwordless user and map their userId, call getUserByEmail and check that the externalId is returned", async function () {
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
                    PasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomEmail: (input) => {
                            return;
                        },
                        createAndSendCustomTextMessage: (input) => {
                            return;
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

            // create a Passwordless user
            const email = "test@example.com";
            const codeInfo = await PasswordlessRecipe.createCode({
                email,
            });

            assert.strictEqual(codeInfo.status, "OK");

            const consumeCodeResponse = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(consumeCodeResponse.status, "OK");

            const superTokensUserId = consumeCodeResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            let response = await PasswordlessRecipe.getUserByEmail({
                email,
            });
            assert.ok(response !== undefined);
            assert.strictEqual(response.id, externalId);
        });
    });

    describe("getUserByPhoneNumber", () => {
        it("create a passwordless user and map their userId, call getUserByPhoneNumber and check that the externalId is returned", async function () {
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
                    PasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomEmail: (input) => {
                            return;
                        },
                        createAndSendCustomTextMessage: (input) => {
                            return;
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

            // create a Passwordless user
            const phoneNumber = "+911234566789";
            const codeInfo = await PasswordlessRecipe.createCode({
                phoneNumber,
            });

            assert.strictEqual(codeInfo.status, "OK");

            const consumeCodeResponse = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(consumeCodeResponse.status, "OK");

            const superTokensUserId = consumeCodeResponse.user.id;
            const externalId = "externalId";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            let response = await PasswordlessRecipe.getUserByPhoneNumber({
                phoneNumber,
            });
            assert.ok(response !== undefined);
            assert.strictEqual(response.id, externalId);
        });
    });

    describe("updateUser", () => {
        it("create a passwordless user and map their userId, call updateUser to add their email and retrieve the user to see if the changes are reflected", async function () {
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
                    PasswordlessRecipe.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        createAndSendCustomEmail: (input) => {
                            return;
                        },
                        createAndSendCustomTextMessage: (input) => {
                            return;
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

            // create a Passwordless user
            const phoneNumber = "+911234566789";
            const codeInfo = await PasswordlessRecipe.createCode({
                phoneNumber,
            });

            assert.strictEqual(codeInfo.status, "OK");

            const consumeCodeResponse = await PasswordlessRecipe.consumeCode({
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(consumeCodeResponse.status, "OK");

            const superTokensUserId = consumeCodeResponse.user.id;
            const externalId = "externalId";
            const email = "test@example.com";

            // create the userIdMapping
            await STExpress.createUserIdMapping({
                superTokensUserId,
                externalUserId: externalId,
            });

            let updateUserResponse = await PasswordlessRecipe.updateUser({
                userId: externalId,
                email,
            });
            assert.strictEqual(updateUserResponse.status, "OK");

            // retrieve user
            let response = await PasswordlessRecipe.getUserByPhoneNumber({
                phoneNumber,
            });
            assert.strictEqual(response.id, externalId);
            assert.strictEqual(response.phoneNumber, phoneNumber);
            assert.strictEqual(response.email, email);
        });
    });
});
