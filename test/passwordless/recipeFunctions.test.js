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
const { printPath, setupST, startST, killAllST, cleanST, resetAll } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;

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

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            let resp = await Passwordless.consumeCode({
                userInputCode: codeInfo.userInputCode,
                deviceId: codeInfo.deviceId,
            });

            assert(resp.status === "OK");
            // TODO: assert(typeof resp.preAuthSessionId === "string");
            assert(resp.createdNewUser);
            assert(typeof resp.user.id === "string");
            assert(resp.user.email === "test@example.com");
            assert(resp.user.phoneNumber === undefined);
            assert(typeof resp.user.timeJoined === "number");
            // TODO: assert(Object.keys(resp).length === 4);
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

            // TODO: assert(resp.status === "INCORRECT_USER_INPUT_CODE_ERROR");
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
});
