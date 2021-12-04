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
        if (!(await isCDIVersionCompatible("2.9"))) {
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
        if (!(await isCDIVersionCompatible("2.9"))) {
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
        if (!(await isCDIVersionCompatible("2.9"))) {
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
        if (!(await isCDIVersionCompatible("2.9"))) {
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
        if (!(await isCDIVersionCompatible("2.9"))) {
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
});
