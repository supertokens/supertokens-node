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
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");

/*
TODO: We actually want to query the APIs with JSON input and check if the JSON output matches the FDI spec for all possible inputs / outputs of the APIs

- consumeCode API
- createCode API
    - provider invalid email and phone number to see a GENERAL_ERROR output as well.
- check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
- emailExists API
- phoneNumberExists API
- resendCode API
*/

describe(`apisFunctions: ${printPath("[test/passwordless/apis.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test consumeCodeAPI with magic link", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let codeInfo = await Passwordless.createCode({
            email: "test@example.com",
        });

        {
            // send an invalid linkCode
            let letInvalidLinkCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        linkCode: "invalidLinkCode",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(letInvalidLinkCodeResponse.status === "RESTART_FLOW_ERROR");
        }

        {
            // send a valid linkCode
            let validLinkCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        linkCode: codeInfo.linkCode,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(validLinkCodeResponse.status === "OK");
            assert(validLinkCodeResponse.createdNewUser === true);
            assert(typeof validLinkCodeResponse.user.id === "string");
            assert(typeof validLinkCodeResponse.user.email === "string");
            assert(typeof validLinkCodeResponse.user.timeJoined === "number");
            assert(Object.keys(validLinkCodeResponse.user).length === 3);
            assert(Object.keys(validLinkCodeResponse).length === 3);
        }
    });

    it("test consumeCodeAPI with code", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let codeInfo = await Passwordless.createCode({
            email: "test@example.com",
        });

        {
            // send an incorrect userInputCode
            let incorrectUserInputCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        userInputCode: "invalidLinkCode",
                        deviceId: codeInfo.deviceId,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(incorrectUserInputCodeResponse.status === "INCORRECT_USER_INPUT_CODE_ERROR");
            assert(incorrectUserInputCodeResponse.failedCodeInputAttemptCount === 1);
            //checking default value for maximumCodeInputAttempts is 5
            assert(incorrectUserInputCodeResponse.maximumCodeInputAttempts === 5);
            assert(Object.keys(incorrectUserInputCodeResponse).length === 3);
        }

        {
            // send a valid userInputCode
            let validUserInputCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        userInputCode: codeInfo.userInputCode,
                        deviceId: codeInfo.deviceId,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(validUserInputCodeResponse.status === "OK");
            assert(validUserInputCodeResponse.createdNewUser === true);
            assert(typeof validUserInputCodeResponse.user.id === "string");
            assert(typeof validUserInputCodeResponse.user.email === "string");
            assert(typeof validUserInputCodeResponse.user.timeJoined === "number");
            assert(Object.keys(validUserInputCodeResponse.user).length === 3);
            assert(Object.keys(validUserInputCodeResponse).length === 3);
        }

        {
            // send a used userInputCode
            let usedUserInputCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        userInputCode: codeInfo.userInputCode,
                        deviceId: codeInfo.deviceId,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );
            assert(usedUserInputCodeResponse.status === "RESTART_FLOW_ERROR");
        }
    });

    it("test consumeCodeAPI with expired code", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            await new Promise((r) => setTimeout(r, 2000)); // wait for code to expire
            let expiredUserInputCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: codeInfo.preAuthSessionId,
                        userInputCode: codeInfo.userInputCode,
                        deviceId: codeInfo.deviceId,
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(expiredUserInputCodeResponse.status === "EXPIRED_USER_INPUT_CODE_ERROR");
            assert(expiredUserInputCodeResponse.failedCodeInputAttemptCount === 1);
            //checking default value for maximumCodeInputAttempts is 5
            assert(expiredUserInputCodeResponse.maximumCodeInputAttempts === 5);
            assert(Object.keys(expiredUserInputCodeResponse).length === 3);
        }
    });
});
