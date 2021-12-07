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
let Passwordless = require("../../recipe/passwordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
let { isCDIVersionCompatible } = require("../utils");

/*
TODO: We want to use the exposed functions and make sure that the all the possible outputs of the recipe interface are according to the types files.

- updateUser
- revokeAllCodes
- revokeCode
- listCodesByEmail
- listCodesByPhoneNumber
- listCodesByDeviceId
- listCodesByPreAuthSessionId
- createMagicLink
    - check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
- signInUp
*/

describe(`recipeFunctions: ${printPath("[test/passwordless/recipeFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("getUser test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        {
            let user = await Passwordless.getUserById({
                userId: "random",
            });

            assert(user === undefined);

            user = (
                await Passwordless.signInUp({
                    email: "test@example.com",
                })
            ).user;

            let result = await Passwordless.getUserById({
                userId: user.id,
            });

            assert(result.id === user.id);
            assert(result.email !== undefined && user.email === result.email);
            assert(result.phoneNumber === undefined);
            assert(typeof result.timeJoined === "number");
            assert(Object.keys(result).length === 3);
        }

        {
            let user = await Passwordless.getUserByEmail({
                email: "random",
            });

            assert(user === undefined);

            user = (
                await Passwordless.signInUp({
                    email: "test@example.com",
                })
            ).user;

            let result = await Passwordless.getUserByEmail({
                email: user.email,
            });

            assert(result.id === user.id);
            assert(result.email !== undefined && user.email === result.email);
            assert(result.phoneNumber === undefined);
            assert(typeof result.timeJoined === "number");
            assert(Object.keys(result).length === 3);
        }

        {
            let user = await Passwordless.getUserByPhoneNumber({
                phoneNumber: "random",
            });

            assert(user === undefined);

            user = (
                await Passwordless.signInUp({
                    phoneNumber: "+1234567890",
                })
            ).user;

            let result = await Passwordless.getUserByPhoneNumber({
                phoneNumber: user.phoneNumber,
            });

            assert(result.id === user.id);
            assert(result.phoneNumber !== undefined && user.phoneNumber === result.phoneNumber);
            assert(result.email === undefined);
            assert(typeof result.timeJoined === "number");
            assert(Object.keys(result).length === 3);
        }
    });

    it("createCode test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        {
            let resp = await Passwordless.createCode({
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
            let resp = await Passwordless.createCode({
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

    it("createNewCodeForDevice test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        {
            let resp = await Passwordless.createCode({
                email: "test@example.com",
            });

            resp = await Passwordless.createNewCodeForDevice({
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
            let resp = await Passwordless.createCode({
                email: "test@example.com",
            });

            resp = await Passwordless.createNewCodeForDevice({
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
            let resp = await Passwordless.createCode({
                email: "test@example.com",
            });

            resp = await Passwordless.createNewCodeForDevice({
                deviceId: "random",
            });

            assert(resp.status === "RESTART_FLOW_ERROR");
            assert(Object.keys(resp).length === 1);
        }

        {
            let resp = await Passwordless.createCode({
                email: "test@example.com",
                userInputCode: "1234",
            });

            resp = await Passwordless.createNewCodeForDevice({
                deviceId: resp.deviceId,
                userInputCode: "1234",
            });

            assert(resp.status === "USER_INPUT_CODE_ALREADY_USED_ERROR");
            assert(Object.keys(resp).length === 1);
        }
    });

    it("consumeCode test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            let resp = await Passwordless.consumeCode({
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert(resp.status === "OK");
            assert(typeof resp.preAuthSessionId === "string");
            assert(resp.createdNewUser);
            assert(typeof resp.user.id === "string");
            assert(resp.user.email === "test@example.com");
            assert(resp.user.phoneNumber === undefined);
            assert(typeof resp.user.timeJoined === "number");
            assert(Object.keys(resp).length === 4);
            assert(Object.keys(resp.user).length === 3);
        }

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            let resp = await Passwordless.consumeCode({
                userInputCode: "random",
                deviceId: codeInfo.deviceId,
            });

            assert(resp.status === "INCORRECT_USER_INPUT_CODE_ERROR");
            assert(resp.failedCodeInputAttemptCount === 1);
            assert(resp.maximumCodeInputAttempts === 5);
            assert(Object.keys(resp).length === 3);
        }

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            let resp = await Passwordless.consumeCode({
                userInputCode: codeInfo.userInputCode,
                deviceId: "random",
            });

            assert(resp.status === "RESTART_FLOW_ERROR");
            assert(Object.keys(resp).length === 1);
        }
    });

    it("consumeCode test with EXPIRED_USER_INPUT_CODE_ERROR", async function () {
        await setKeyValueInConfig("passwordless_code_lifetime", 1000); // one second lifetime
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            await new Promise((r) => setTimeout(r, 2000)); // wait for code to expire

            let resp = await Passwordless.consumeCode({
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
    it("updateUser contactMethod email test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let userInfo = await Passwordless.signInUp({
            email: "test@example.com",
        });

        {
            // update users email
            let response = await Passwordless.updateUser({
                userId: userInfo.user.id,
                email: "test2@example.com",
            });
            assert(response.status === "OK");

            let result = await Passwordless.getUserById({
                userId: userInfo.user.id,
            });

            assert(result.email === "test2@example.com");
        }
        {
            // update user with invalid userId
            let response = await Passwordless.updateUser({
                userId: "invalidUserId",
                email: "test2@example.com",
            });
            assert(response.status === "UNKNOWN_USER_ID_ERROR");
        }
        {
            // update user with an email that already exists
            let userInfo2 = await Passwordless.signInUp({
                email: "test3@example.com",
            });

            let result = await Passwordless.updateUser({
                userId: userInfo2.user.id,
                email: "test2@example.com",
            });

            assert(result.status === "EMAIL_ALREADY_EXISTS_ERROR");
        }
    });

    it("updateUser contactMethod phone test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let phoneNumber_1 = "+1234567890";
        let phoneNumber_2 = "+1234567890";
        let phoneNumber_3 = "+1234567890";

        let userInfo = await Passwordless.signInUp({
            phoneNumber: phoneNumber_1,
        });

        {
            // update users email
            let response = await Passwordless.updateUser({
                userId: userInfo.user.id,
                phoneNumber: phoneNumber_2,
            });
            assert(response.status === "OK");

            let result = await Passwordless.getUserById({
                userId: userInfo.user.id,
            });

            assert(result.phoneNumber === phoneNumber_2);
        }
        {
            // update user with a phoneNumber that already exists
            let userInfo2 = await Passwordless.signInUp({
                phoneNumber: phoneNumber_3,
            });

            let result = await Passwordless.updateUser({
                userId: userInfo2.user.id,
                phoneNumber: phoneNumber_2,
            });

            assert(result.status === "PHONE_NUMBER_ALREADY_EXISTS_ERROR");
        }
    });

    // revokeAllCodes
    it("revokeAllCodes test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let codeInfo_1 = await Passwordless.createCode({
            email: "test@example.com",
        });

        let codeInfo_2 = await Passwordless.createCode({
            email: "test@example.com",
        });

        {
            let result = await Passwordless.revokeAllCodes({
                email: "test@example.com",
            });

            assert(result.status === "OK");
        }

        {
            let result_1 = await Passwordless.consumeCode({
                deviceId: codeInfo_1.deviceId,
                userInputCode: codeInfo_1.userInputCode,
            });

            assert(result_1.status === "RESTART_FLOW_ERROR");

            let result_2 = await Passwordless.consumeCode({
                deviceId: codeInfo_2.deviceId,
                userInputCode: codeInfo_2.userInputCode,
            });

            assert(result_2.status === "RESTART_FLOW_ERROR");
        }
    });

    it("revokeCode test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let codeInfo_1 = await Passwordless.createCode({
            email: "test@example.com",
        });

        let codeInfo_2 = await Passwordless.createCode({
            email: "test@example.com",
        });

        {
            let result = await Passwordless.revokeCode({
                codeId: codeInfo_1.codeId,
            });

            assert(result.status === "OK");
        }

        {
            let result_1 = await Passwordless.consumeCode({
                deviceId: codeInfo_1.deviceId,
                userInputCode: codeInfo_1.userInputCode,
            });

            assert(result_1.status === "RESTART_FLOW_ERROR");

            let result_2 = await Passwordless.consumeCode({
                deviceId: codeInfo_2.deviceId,
                userInputCode: codeInfo_2.userInputCode,
            });

            assert(result_2.status === "OK");
        }
    });

    // listCodesByEmail
    it("listCodesByEmail test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let codeInfo_1 = await Passwordless.createCode({
            email: "test@example.com",
        });

        let codeInfo_2 = await Passwordless.createCode({
            email: "test@example.com",
        });

        let result = await Passwordless.listCodesByEmail({
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
    it("listCodesByPhoneNumber test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let codeInfo_1 = await Passwordless.createCode({
            phoneNumber: "+1234567890",
        });

        let codeInfo_2 = await Passwordless.createCode({
            phoneNumber: "+1234567890",
        });

        let result = await Passwordless.listCodesByPhoneNumber({
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
    it("listCodesByDeviceId and listCodesByPreAuthSessionId test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let codeInfo_1 = await Passwordless.createCode({
            phoneNumber: "+1234567890",
        });

        {
            let result = await Passwordless.listCodesByDeviceId({
                deviceId: codeInfo_1.deviceId,
            });
            assert(result.codes[0].codeId === codeInfo_1.codeId);
        }

        {
            let result = await Passwordless.listCodesByPreAuthSessionId({
                preAuthSessionId: codeInfo_1.preAuthSessionId,
            });
            assert(result.codes[0].codeId === codeInfo_1.codeId);
        }
    });

    /*
    - createMagicLink
    - check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
    */

    it("createMagicLink test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let result = await Passwordless.createMagicLink({
            phoneNumber: "+1234567890",
        });

        let magicLinkURL = new URL(result);

        assert(magicLinkURL.hostname === "supertokens.io");
        assert(magicLinkURL.pathname === "/auth/verify");
        assert(magicLinkURL.searchParams.get("rid") === "passwordless");
        assert(typeof magicLinkURL.searchParams.get("preAuthSessionId") === "string");
        assert(magicLinkURL.hash.length > 1);
    });

    // signInUp test
    it("signInUp test", async function () {
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
                Session.init(),
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        let result = await Passwordless.signInUp({
            phoneNumber: "+1234567890",
        });

        assert(result.status === "OK");
        assert(result.createdNewUser === true);
        assert(typeof result.preAuthSessionId === "string");
        assert(Object.keys(result).length === 4);

        assert(result.user.phoneNumber === "+1234567890");
        assert(typeof result.user.id === "string");
        assert(typeof result.user.timeJoined === "number");
        assert(Object.keys(result.user).length === 3);
    });
});
