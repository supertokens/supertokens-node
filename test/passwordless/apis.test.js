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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig, stopST } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let Passwordless = require("../../recipe/passwordless");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../lib/build/supertokens").default;
const request = require("supertest");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let { isCDIVersionCompatible } = require("../utils");

/*
TODO: We actually want to query the APIs with JSON input and check if the JSON output matches the FDI spec for all possible inputs / outputs of the APIs

- consumeCode API
    - check that if user has not given linkCode nor (deviceId+userInputCode), it throws a bad request error.
- createCode API
    - provider invalid email and phone number to see a GENERAL_ERROR output as well.
    - check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
- emailExists API
- phoneNumberExists API
- resendCode API
    - test that you create a code with PHONE in config, you then change the config to use EMAIL, you call resendCode API, it should return RESTART_FLOW_ERROR
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

    // check that if user has not given linkCode nor (deviceId+userInputCode), it throws a bad request error.
    it("test not passing any fields to consumeCodeAPI", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // dont send linkCode or (deviceId+userInputCode)
            let badResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: "sessionId",
                    })
                    .expect(400)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(badResponse.res.statusMessage === "Bad Request");
            assert(
                JSON.parse(badResponse.text).message ===
                    "Please provide one of (linkCode) or (deviceId+userInputCode) and not both"
            );
        }
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

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

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

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

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

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

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

    it("test createCodeAPI with email", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "test@example.com",
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
            assert(validCreateCodeResponse.status === "OK");
            assert(typeof validCreateCodeResponse.deviceId === "string");
            assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
            assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
            assert(Object.keys(validCreateCodeResponse).length === 4);
        }

        {
            // passing invalid email
            let invalidEmailCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "invalidEmail",
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
            assert(invalidEmailCreateCodeResponse.status === "GENERAL_ERROR");
            assert(invalidEmailCreateCodeResponse.message === "Email is invalid");
        }
    });

    it("test createCodeAPI with phoneNumber", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "+1234567890",
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
            assert(validCreateCodeResponse.status === "OK");
            assert(typeof validCreateCodeResponse.deviceId === "string");
            assert(typeof validCreateCodeResponse.preAuthSessionId === "string");
            assert(validCreateCodeResponse.flowType === "USER_INPUT_CODE_AND_MAGIC_LINK");
            assert(Object.keys(validCreateCodeResponse).length === 4);
        }

        {
            // passing invalid phoneNumber
            let invalidPhoneNumberCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        phoneNumber: "123",
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
            assert(invalidPhoneNumberCreateCodeResponse.status === "GENERAL_ERROR");
            assert(invalidPhoneNumberCreateCodeResponse.message === "Phone number is invalid");
        }
    });

    it("test magicLink format in createCodeAPI", async function () {
        await startST();

        let magicLinkURL = undefined;
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
                    createAndSendCustomEmail: (input) => {
                        magicLinkURL = new URL(input.urlWithLinkCode);
                    },
                }),
            ],
        });

        // run test if current CDI version >= 2.10
        if (!(await isCDIVersionCompatible("2.10"))) {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // passing valid field
            let validCreateCodeResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code")
                    .send({
                        email: "test@example.com",
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

            assert(validCreateCodeResponse.status === "OK");

            // check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
            assert(magicLinkURL.hostname === "supertokens.io");
            assert(magicLinkURL.pathname === "/auth/verify");
            assert(magicLinkURL.searchParams.get("rid") === "passwordless");
            assert(magicLinkURL.searchParams.get("preAuthSessionId") === validCreateCodeResponse.preAuthSessionId);
            assert(magicLinkURL.hash.length > 1);
        }
    });

    it("test emailExistsAPI", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // email does not exist
            let emailDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "test@example.com",
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
            assert(emailDoesNotExistResponse.status === "OK");
            assert(emailDoesNotExistResponse.exists === false);
        }

        {
            // email exists

            // create a passwordless user through email
            let codeInfo = await Passwordless.createCode({
                email: "test@example.com",
            });

            await Passwordless.consumeCode({
                linkCode: codeInfo.linkCode,
            });

            let emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "test@example.com",
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
            assert(emailExistsResponse.status === "OK");
            assert(emailExistsResponse.exists === true);
        }
    });

    it("test phoneNumberExistsAPI", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            // phoneNumber does not exist
            let phoneNumberDoesNotExistResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/phonenumber/exists")
                    .query({
                        phoneNumber: "+1234567890",
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
            assert(phoneNumberDoesNotExistResponse.status === "OK");
            assert(phoneNumberDoesNotExistResponse.exists === false);
        }

        {
            // phoneNumber exists

            // create a passwordless user through phone
            let codeInfo = await Passwordless.createCode({
                phoneNumber: "+1234567890",
            });

            await Passwordless.consumeCode({
                linkCode: codeInfo.linkCode,
            });

            let phoneNumberExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/phonenumber/exists")
                    .query({
                        phoneNumber: "+1234567890",
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
            assert(phoneNumberExistsResponse.status === "OK");
            assert(phoneNumberExistsResponse.exists === true);
        }
    });

    //resendCode API

    it("test resendCodeAPI", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            let codeInfo = await Passwordless.createCode({
                phoneNumber: "+1234567890",
            });

            // valid response
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/resend")
                    .send({
                        deviceId: codeInfo.deviceId,
                        preAuthSessionId: codeInfo.preAuthSessionId,
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
            assert(response.status === "OK");
        }

        {
            // invalid preAuthSessionId and deviceId
            let response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signinup/code/resend")
                    .send({
                        deviceId: "TU/52WOcktSv99zqaAZuWJG9BSoS0aRLfCbep8rFEwk=",
                        preAuthSessionId: "kFmkPQEAJtACiT2w/K8fndEuNm+XozJXSZSlWEr+iGs=",
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

            assert(response.status === "RESTART_FLOW_ERROR");
        }
    });

    // test that you create a code with PHONE in config, you then change the config to use EMAIL, you call resendCode API, it should return RESTART_FLOW_ERROR
    it("test resendCodeAPI when changing contact method", async function () {
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

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        {
            let codeInfo = await Passwordless.createCode({
                phoneNumber: "+1234567890",
            });

            await killAllST();
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
                // invalid preAuthSessionId and deviceId
                let response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signinup/code/resend")
                        .send({
                            deviceId: codeInfo.deviceId,
                            preAuthSessionId: codeInfo.preAuthSessionId,
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

                assert(response.status === "RESTART_FLOW_ERROR");
            }
        }
    });
});
