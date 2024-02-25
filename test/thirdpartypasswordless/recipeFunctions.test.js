/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let ThirdPartyPasswordless = require("../../recipe/thirdpartypasswordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const EmailVerification = require("../../recipe/emailverification");
let { isCDIVersionCompatible } = require("../utils");
const { default: RecipeUserId } = require("../../lib/build/recipeUserId");

describe(`recipeFunctions: ${printPath("[test/thirdpartypasswordless/recipeFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test that creating a user with ThirdParty, and they have a verified email that, isEmailVerified returns true and the opposite case
    it("test with thirdPartyPasswordless, for ThirdParty user that isEmailVerified returns the correct email verification status", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [{ config: { thirdPartyId: "customProvider" } }],
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
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        // create a ThirdParty user with a verified email
        let response = await ThirdPartyPasswordless.thirdPartyManuallyCreateOrUpdateUser(
            "public",
            "customProvider",
            "verifiedUser",
            "test@example.com",
            false
        );

        // verify the user's email
        let emailVerificationToken = await EmailVerification.createEmailVerificationToken(
            "public",
            STExpress.convertToRecipeUserId(response.user.id),
            response.user.email
        );
        await EmailVerification.verifyEmailUsingToken("public", emailVerificationToken.token);

        // check that the ThirdParty user's email is verified
        assert(await EmailVerification.isEmailVerified(STExpress.convertToRecipeUserId(response.user.id)));

        // create a ThirdParty user with an unverfied email and check that it is not verified
        let response2 = await ThirdPartyPasswordless.thirdPartyManuallyCreateOrUpdateUser(
            "public",
            "customProvider2",
            "NotVerifiedUser",
            "test@example.com",
            false
        );

        assert(
            !(await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response2.user.id),
                response2.user.email
            ))
        );
    });

    it("test with thirdPartyPasswordless, for Passwordless user that isEmailVerified returns true for both email and phone", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
                ThirdPartyPasswordless.init({
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
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        // create a Passwordless user with email
        let response = await ThirdPartyPasswordless.passwordlessSignInUp({
            tenantId: "public",
            email: "test@example.com",
        });

        // check that the Passwordless user's email is verified
        assert(
            await EmailVerification.isEmailVerified(
                STExpress.convertToRecipeUserId(response.user.id),
                response.user.email
            )
        );

        // check that creating an email verification with a verified passwordless user should return EMAIL_ALREADY_VERIFIED_ERROR
        assert(
            (
                await EmailVerification.createEmailVerificationToken(
                    "public",
                    STExpress.convertToRecipeUserId(response.user.id),
                    response.user.email
                )
            ).status === "EMAIL_ALREADY_VERIFIED_ERROR"
        );

        // create a Passwordless user with phone and check that it is verified
        let response2 = await ThirdPartyPasswordless.passwordlessSignInUp({
            tenantId: "public",
            phoneNumber: "+123456789012",
        });

        // check that the Passwordless phone number user's is automatically verified
        assert(await EmailVerification.isEmailVerified(STExpress.convertToRecipeUserId(response2.user.id)));
        // check that creating an email verification with a phone-based passwordless user should return EMAIL_ALREADY_VERIFIED_ERROR
        assert.equal(
            (
                await EmailVerification.createEmailVerificationToken(
                    "public",
                    STExpress.convertToRecipeUserId(response2.user.id)
                )
            ).status,
            "EMAIL_ALREADY_VERIFIED_ERROR"
        );
    });

    it("test with thirdPartyPasswordless, getUser functionality", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        const email = "test@example.com";
        {
            let user = await STExpress.getUser("random");

            assert(user === undefined);

            user = (
                await ThirdPartyPasswordless.passwordlessSignInUp({
                    tenantId: "public",
                    email,
                })
            ).user;

            let userId = user.id;
            let result = await STExpress.getUser(userId);

            assert.strictEqual(result.id, user.id);
            assert.strictEqual(result.emails[0], email);
            assert.strictEqual(result.phoneNumbers.length, 0);
            assert.strictEqual(typeof result.timeJoined, "number");
            assert.strictEqual(result.loginMethods[0].tenantIds.length, 1);
            assert.strictEqual(Object.keys(result).length, 8);
        }

        {
            let users = await STExpress.listUsersByAccountInfo("public", {
                email: "random",
            });

            assert(users.length === 0);

            let user = (
                await ThirdPartyPasswordless.passwordlessSignInUp({
                    tenantId: "public",
                    email: "test@example.com",
                })
            ).user;

            let result = await STExpress.listUsersByAccountInfo("public", {
                email,
            });

            assert(result.length === 1);

            let userInfo = result[0];

            assert.strictEqual(userInfo.id, user.id);
            assert.strictEqual(userInfo.emails[0], email);
            assert.strictEqual(userInfo.phoneNumbers.length, 0);
            assert.strictEqual(typeof userInfo.timeJoined, "number");
            assert.strictEqual(userInfo.loginMethods[0].tenantIds.length, 1);
            assert.strictEqual(Object.keys(userInfo).length, 8);
        }

        {
            let user = await STExpress.listUsersByAccountInfo("public", {
                phoneNumber: "random",
            });

            assert(user.length === 0);

            const phoneNumber = "+1234567890";
            user = (
                await ThirdPartyPasswordless.passwordlessSignInUp({
                    tenantId: "public",
                    phoneNumber,
                })
            ).user;

            let result = await STExpress.listUsersByAccountInfo("public", {
                phoneNumber,
            });
            assert.strictEqual(result[0].id, user.id);
            assert.strictEqual(result[0].phoneNumbers[0], phoneNumber);
            assert.strictEqual(result[0].emails.length, 0);
            assert.strictEqual(typeof result[0].timeJoined, "number");
            assert.strictEqual(result[0].loginMethods[0].tenantIds.length, 1);
            assert.strictEqual(Object.keys(result[0]).length, 8);
        }
    });

    it("test with thirdPartyPasswordless, createCode test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            assert(resp.status === "OK");
            assert(typeof resp.preAuthSessionId === "string");
            assert(typeof resp.codeId === "string");
            assert(typeof resp.deviceId === "string");
            assert(typeof resp.userInputCode === "string");
            assert(typeof resp.linkCode === "string");
            assert(typeof resp.codeLifetime === "number");
            assert(typeof resp.timeCreated === "number");
            assert(Object.keys(resp).length === 8);
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
                userInputCode: "123",
            });

            assert(resp.status === "OK");
            assert(typeof resp.preAuthSessionId === "string");
            assert(typeof resp.codeId === "string");
            assert(typeof resp.deviceId === "string");
            assert(typeof resp.userInputCode === "string");
            assert(typeof resp.linkCode === "string");
            assert(typeof resp.codeLifetime === "number");
            assert(typeof resp.timeCreated === "number");
            assert(Object.keys(resp).length === 8);
        }
    });

    it("thirdPartyPasswordless createNewCodeForDevice test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            resp = await ThirdPartyPasswordless.createNewCodeForDevice({
                tenantId: "public",
                deviceId: resp.deviceId,
            });

            assert(resp.status === "OK");
            assert(typeof resp.preAuthSessionId === "string");
            assert(typeof resp.codeId === "string");
            assert(typeof resp.deviceId === "string");
            assert(typeof resp.userInputCode === "string");
            assert(typeof resp.linkCode === "string");
            assert(typeof resp.codeLifetime === "number");
            assert(typeof resp.timeCreated === "number");
            assert(Object.keys(resp).length === 8);
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            resp = await ThirdPartyPasswordless.createNewCodeForDevice({
                tenantId: "public",
                deviceId: resp.deviceId,
                userInputCode: "1234",
            });

            assert(resp.status === "OK");
            assert(typeof resp.preAuthSessionId === "string");
            assert(typeof resp.codeId === "string");
            assert(typeof resp.deviceId === "string");
            assert(typeof resp.userInputCode === "string");
            assert(typeof resp.linkCode === "string");
            assert(typeof resp.codeLifetime === "number");
            assert(typeof resp.timeCreated === "number");
            assert(Object.keys(resp).length === 8);
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            resp = await ThirdPartyPasswordless.createNewCodeForDevice({
                tenantId: "public",
                deviceId: "random",
            });

            assert(resp.status === "RESTART_FLOW_ERROR");
            assert(Object.keys(resp).length === 1);
        }

        {
            let resp = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
                userInputCode: "1234",
            });

            resp = await ThirdPartyPasswordless.createNewCodeForDevice({
                tenantId: "public",
                deviceId: resp.deviceId,
                userInputCode: "1234",
            });

            assert(resp.status === "USER_INPUT_CODE_ALREADY_USED_ERROR");
            assert(Object.keys(resp).length === 1);
        }
    });

    it("thirdPartyPasswordless consumeCode test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        {
            let codeInfo = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            let resp = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert.strictEqual(resp.status, "OK");
            assert(resp.createdNewRecipeUser);
            assert.strictEqual(typeof resp.user.id, "string");
            assert.strictEqual(resp.user.emails[0], "test@example.com");
            assert.strictEqual(resp.user.phoneNumbers[0], undefined);
            assert.strictEqual(typeof resp.user.timeJoined, "number");
            assert.strictEqual(Object.keys(resp).length, 6);
            assert.strictEqual(Object.keys(resp.user).length, 8);
        }

        {
            let codeInfo = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            let resp = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: "random",
                deviceId: codeInfo.deviceId,
            });

            assert(resp.status === "INCORRECT_USER_INPUT_CODE_ERROR");
            assert(resp.failedCodeInputAttemptCount === 1);
            assert(resp.maximumCodeInputAttempts === 5);
            assert(Object.keys(resp).length === 3);
        }

        {
            let codeInfo = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            try {
                await ThirdPartyPasswordless.consumeCode({
                    tenantId: "public",
                    preAuthSessionId: "random",
                    userInputCode: codeInfo.userInputCode,
                    deviceId: codeInfo.deviceId,
                });
                assert(false);
            } catch (err) {
                assert(err.message.includes("preAuthSessionId and deviceId doesn't match"));
            }
        }
    });

    it("thirdPartyPasswordless, consumeCode test with EXPIRED_USER_INPUT_CODE_ERROR", async function () {
        const connectionURI = await startST({
            coreConfig: {
                passwordless_code_lifetime: 1000, // one second lifetime
            },
        });

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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        {
            let codeInfo = await ThirdPartyPasswordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            await new Promise((r) => setTimeout(r, 2000)); // wait for code to expire

            let resp = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo.preAuthSessionId,
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert(resp.status === "EXPIRED_USER_INPUT_CODE_ERROR");
            assert(resp.failedCodeInputAttemptCount === 1);
            assert(resp.maximumCodeInputAttempts === 5);
            assert(Object.keys(resp).length === 3);
        }
    });

    // updateUser
    it("thirdPartyPasswordless, updateUser contactMethod email test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let userInfo = await ThirdPartyPasswordless.passwordlessSignInUp({
            tenantId: "public",
            email: "test@example.com",
        });
        {
            // update users email
            let response = await ThirdPartyPasswordless.updatePasswordlessUser({
                recipeUserId: userInfo.user.loginMethods[0].recipeUserId,
                email: "test2@example.com",
            });
            assert(response.status === "OK");

            let result = await STExpress.getUser(userInfo.user.id);

            assert(result.emails[0] === "test2@example.com");
        }
        {
            // update user with invalid userId
            let response = await ThirdPartyPasswordless.updatePasswordlessUser({
                recipeUserId: STExpress.convertToRecipeUserId("invalidUserId"),
                email: "test2@example.com",
            });

            assert(response.status === "UNKNOWN_USER_ID_ERROR");
        }
        {
            // update user with an email that already exists
            let userInfo2 = await ThirdPartyPasswordless.passwordlessSignInUp({
                tenantId: "public",
                email: "test3@example.com",
            });

            let result = await ThirdPartyPasswordless.updatePasswordlessUser({
                recipeUserId: userInfo2.user.loginMethods[0].recipeUserId,
                email: "test2@example.com",
            });

            assert(result.status === "EMAIL_ALREADY_EXISTS_ERROR");
        }
    });

    it("thirdPartyPasswordless, updateUser contactMethod phone test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let phoneNumber_1 = "+1234567891";
        let phoneNumber_2 = "+1234567892";
        let phoneNumber_3 = "+1234567893";

        let userInfo = await ThirdPartyPasswordless.passwordlessSignInUp({
            tenantId: "public",
            phoneNumber: phoneNumber_1,
        });

        {
            // update users email
            let response = await ThirdPartyPasswordless.updatePasswordlessUser({
                recipeUserId: userInfo.user.loginMethods[0].recipeUserId,
                phoneNumber: phoneNumber_2,
            });
            assert(response.status === "OK");

            let result = await STExpress.getUser(userInfo.user.id);

            assert(result.phoneNumbers[0] === phoneNumber_2);
        }
        {
            // update user with a phoneNumber that already exists
            let userInfo2 = await ThirdPartyPasswordless.passwordlessSignInUp({
                tenantId: "public",
                phoneNumber: phoneNumber_3,
            });

            let result = await ThirdPartyPasswordless.updatePasswordlessUser({
                recipeUserId: userInfo2.user.loginMethods[0].recipeUserId,
                phoneNumber: phoneNumber_2,
            });

            assert(result.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR");
        }
    });

    // revokeAllCodes
    it("thirdPartyPasswordless, revokeAllCodes test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let codeInfo_1 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        let codeInfo_2 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        {
            let result = await ThirdPartyPasswordless.revokeAllCodes({
                tenantId: "public",
                email: "test@example.com",
            });

            assert(result.status === "OK");
        }

        {
            let result_1 = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo_1.preAuthSessionId,
                deviceId: codeInfo_1.deviceId,
                userInputCode: codeInfo_1.userInputCode,
            });

            assert(result_1.status === "RESTART_FLOW_ERROR");

            let result_2 = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo_2.preAuthSessionId,
                deviceId: codeInfo_2.deviceId,
                userInputCode: codeInfo_2.userInputCode,
            });

            assert(result_2.status === "RESTART_FLOW_ERROR");
        }
    });

    it("thirdPartyPasswordless, revokeCode test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let codeInfo_1 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        let codeInfo_2 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        {
            let result = await ThirdPartyPasswordless.revokeCode({
                tenantId: "public",
                codeId: codeInfo_1.codeId,
            });

            assert(result.status === "OK");
        }

        {
            let result_1 = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo_1.preAuthSessionId,
                deviceId: codeInfo_1.deviceId,
                userInputCode: codeInfo_1.userInputCode,
            });

            assert(result_1.status === "RESTART_FLOW_ERROR");

            let result_2 = await ThirdPartyPasswordless.consumeCode({
                tenantId: "public",
                preAuthSessionId: codeInfo_2.preAuthSessionId,
                deviceId: codeInfo_2.deviceId,
                userInputCode: codeInfo_2.userInputCode,
            });

            assert(result_2.status === "OK");
        }
    });

    // listCodesByEmail
    it("thirdPartyPasswordless, listCodesByEmail test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let codeInfo_1 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        let codeInfo_2 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            email: "test@example.com",
        });

        let result = await ThirdPartyPasswordless.listCodesByEmail({
            tenantId: "public",
            email: "test@example.com",
        });
        assert(result.length === 2);
        result.forEach((element) => {
            element.codes.forEach((code) => {
                if (!(code.codeId === codeInfo_1.codeId || code.codeId === codeInfo_2.codeId)) {
                    assert(false);
                }
            });
        });
    });

    //listCodesByPhoneNumber
    it("thirdPartyPasswordless, listCodesByPhoneNumber test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let codeInfo_1 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            phoneNumber: "+1234567890",
        });

        let codeInfo_2 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            phoneNumber: "+1234567890",
        });

        let result = await ThirdPartyPasswordless.listCodesByPhoneNumber({
            tenantId: "public",
            phoneNumber: "+1234567890",
        });
        assert(result.length === 2);
        result.forEach((element) => {
            element.codes.forEach((code) => {
                if (!(code.codeId === codeInfo_1.codeId || code.codeId === codeInfo_2.codeId)) {
                    assert(false);
                }
            });
        });
    });

    // listCodesByDeviceId and listCodesByPreAuthSessionId
    it("thirdPartyPasswordless, listCodesByDeviceId and listCodesByPreAuthSessionId test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let codeInfo_1 = await ThirdPartyPasswordless.createCode({
            tenantId: "public",
            phoneNumber: "+1234567890",
        });

        {
            let result = await ThirdPartyPasswordless.listCodesByDeviceId({
                tenantId: "public",
                deviceId: codeInfo_1.deviceId,
            });
            assert(result.codes[0].codeId === codeInfo_1.codeId);
        }

        {
            let result = await ThirdPartyPasswordless.listCodesByPreAuthSessionId({
                tenantId: "public",
                preAuthSessionId: codeInfo_1.preAuthSessionId,
            });
            assert(result.codes[0].codeId === codeInfo_1.codeId);
        }
    });

    /*
    - createMagicLink
    - check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
    */

    it("thirdPartyPasswordless, createMagicLink test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        sendSms: async (input) => {
                            return;
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let result = await ThirdPartyPasswordless.createMagicLink({
            tenantId: "public",
            phoneNumber: "+1234567890",
        });

        let magicLinkURL = new URL(result);

        assert(magicLinkURL.hostname === "supertokens.io");
        assert(magicLinkURL.pathname === "/auth/verify");
        assert(magicLinkURL.searchParams.get("rid") === "thirdpartypasswordless");
        assert(typeof magicLinkURL.searchParams.get("preAuthSessionId") === "string");
        assert(magicLinkURL.hash.length > 1);
    });

    // signInUp test
    it("thirdPartyPasswordless, signInUp test", async function () {
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
                Session.init({ getTokenTransferMethod: () => "cookie" }),
                ThirdPartyPasswordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    smsDelivery: {
                        service: {
                            sendSms: async (input) => {
                                return;
                            },
                        },
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let result = await ThirdPartyPasswordless.passwordlessSignInUp({
            tenantId: "public",
            phoneNumber: "+12345678901",
        });

        assert(result.status === "OK");
        assert(result.createdNewRecipeUser === true);
        assert(Object.keys(result).length === 4);

        assert.strictEqual(result.user.phoneNumbers[0], "+12345678901");
        assert.strictEqual(typeof result.user.id, "string");
        assert.strictEqual(typeof result.user.timeJoined, "number");
        assert(result.user.loginMethods[0].tenantIds.length === 1);
        assert.strictEqual(Object.keys(result.user).length, 8);
    });
});
