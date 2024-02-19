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

const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll, signUPRequest } = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
var url = require("url");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let generatePasswordResetToken = require("../../lib/build/recipe/emailpassword/api/generatePasswordResetToken").default;
let passwordReset = require("../../lib/build/recipe/emailpassword/api/passwordReset").default;
let createResetPasswordLink = require("../../lib/build/recipe/emailpassword/index.js").createResetPasswordLink;
let sendResetPasswordEmail = require("../../lib/build/recipe/emailpassword/index.js").sendResetPasswordEmail;
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");
let { maxVersion } = require("../../lib/build/utils");

/**
 * TODO: generate token API:
 *        - (later) Call the createResetPasswordToken function with valid input
 *        - (later) Call the createResetPasswordToken with unknown userId and test error thrown
 * TODO: password reset API:
 *        - (later) Call the resetPasswordUsingToken function with valid input
 *        - (later) Call the resetPasswordUsingToken with an invalid token and see the error
 *        - (later) token is not of type string from input
 */

describe(`passwordreset: ${printPath("[test/emailpassword/passwordreset.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    /*
     * generate token API:
     *      - email validation checks
     *      - non existent email should return "OK" with a pause > 300MS
     *      - check that the generated password reset link is correct
     */
    it("test email validation checks in generate token API", async function () {
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
            recipeList: [EmailPassword.init(), Session.init()],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "random",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.body.status === "FIELD_ERROR");
        assert(response.body.formFields.length === 1);
        assert(response.body.formFields[0].error === "Email is invalid");
        assert(response.body.formFields[0].id === "email");
    });

    it("test that generated password link is correct", async function () {
        const connectionURI = await startST();

        let resetURL = "";
        let tokenInfo = "";
        let ridInfo = "";
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
                EmailPassword.init({
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                const searchParams = new URLSearchParams(new URL(input.passwordResetLink).search);
                                resetURL = input.passwordResetLink.split("?")[0];
                                tokenInfo = searchParams.get("token");
                                ridInfo = searchParams.get("rid");
                                tenantInfo = searchParams.get("tenantId");
                            },
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(resetURL === "https://supertokens.io/auth/reset-password");
        assert.notStrictEqual(tokenInfo, undefined);
        assert.notStrictEqual(tokenInfo, null);
        assert.strictEqual(ridInfo, "emailpassword");
        assert.strictEqual(tenantInfo, "public");
    });

    /*
     * password reset API:
     *        - password validation checks
     *        - token is missing from input
     *        - invalid token in input
     *        - input is valid, check that password has changed (call sign in)
     */
    it("test password validation", async function () {
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
            recipeList: [EmailPassword.init(), Session.init()],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "invalid",
                        },
                    ],
                    token: "randomToken",
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
        assert(response.status === "FIELD_ERROR");
        assert(response.formFields[0].error === "Password must contain at least 8 characters, including a number");
        assert(response.formFields[0].id === "password");

        response = await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                    ],
                    token: "randomToken",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );
        assert(response.status !== "FIELD_ERROR");
    });

    it("test token missing from input", async function () {
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
            recipeList: [EmailPassword.init(), Session.init()],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                    ],
                })
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );
        assert(response.message === "Please provide the password reset token");
    });

    it("test invalid token input", async function () {
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
            recipeList: [EmailPassword.init(), Session.init()],
        });
        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                    ],
                    token: "invalidToken",
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
        assert(response.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR");
    });

    it("test valid token input and passoword has changed", async function () {
        const connectionURI = await startST();

        let passwordResetUserId = undefined;
        let token = "";
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
                EmailPassword.init({
                    emailDelivery: {
                        override: (oI) => {
                            return {
                                ...oI,
                                sendEmail: async (input) => {
                                    token = input.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                                },
                            };
                        },
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                passwordResetPOST: async function (input) {
                                    let resp = await oI.passwordResetPOST(input);
                                    passwordResetUserId = resp.user.id;
                                    return resp;
                                },
                            };
                        },
                    },
                    emailDelivery: {
                        service: {
                            sendEmail: async (input) => {
                                const searchParams = new URLSearchParams(new URL(input.passwordResetLink).search);
                                token = searchParams.get("token");
                            },
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;

        await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass12345",
                        },
                    ],
                    token,
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

        assert(passwordResetUserId !== undefined && passwordResetUserId === userInfo.id);

        let failureResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
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
        assert(failureResponse.status === "WRONG_CREDENTIALS_ERROR");

        let successResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass12345",
                        },
                        {
                            id: "email",
                            value: "random@gmail.com",
                        },
                    ],
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
        assert(successResponse.status === "OK");
        assert(successResponse.user.id === userInfo.id);
        assert(successResponse.user.email === userInfo.email);
    });

    describe("createPasswordResetToken tests", function () {
        it("createPasswordResetToken with random user ID fails", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            let resetPassword = await EmailPassword.createResetPasswordToken("public", "random", "test@example.com");

            assert(resetPassword.status === "UNKNOWN_USER_ID_ERROR");
        });

        it("createPasswordResetToken with primary user, non email password succeeds", async function () {
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
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                ],
            });

            let user = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );

            let tokenInfo = await EmailPassword.createResetPasswordToken("public", user.user.id, "test@example.com");

            assert.strictEqual(tokenInfo.status, "OK");
        });
    });

    describe("consumePasswordResetToken tests", function () {
        it("consumePasswordResetToken works when token is valid", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            let user = await EmailPassword.signUp("public", "test@example.com", "password1234");

            let resetPassword = await EmailPassword.createResetPasswordToken(
                "public",
                user.user.id,
                "test@example.com"
            );

            let info = await EmailPassword.consumePasswordResetToken("public", resetPassword.token);

            assert(info.status === "OK");
            assert(info.userId === user.user.id);
            assert(info.email === "test@example.com");
        });

        it("consumePasswordResetToken returns RESET_PASSWORD_INVALID_TOKEN_ERROR error if the token does not exist", async function () {
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
                recipeList: [EmailPassword.init(), Session.init()],
            });

            let info = await EmailPassword.consumePasswordResetToken("public", "random");

            assert(info.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR");
        });

        it("consumePasswordResetToken with primary user, non email password succeeds", async function () {
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
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                ],
            });

            let user = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );

            let tokenInfo = await EmailPassword.createResetPasswordToken("public", user.user.id, "test@example.com");

            let info = await EmailPassword.consumePasswordResetToken("public", tokenInfo.token);

            assert(info.status === "OK");
            assert(info.userId === user.user.id);
            assert(info.email === "test@example.com");
        });
    });

    it("Test that reset password link uses the correct origin", async function () {
        const connectionURI = await startST();
        let emailPasswordLink = "";
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    if (request.getHeaderValue("origin") !== undefined) {
                        return request.getHeaderValue("origin");
                    }

                    return "localhost:3000";
                },
            },
            recipeList: [
                EmailPassword.init({
                    emailDelivery: {
                        override: (original) => {
                            return {
                                ...original,
                                sendEmail: async (input) => {
                                    emailPasswordLink = input.passwordResetLink;
                                },
                            };
                        },
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        await EmailPassword.signUp("public", "test@example.com", "password1234");

        await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );

        let currentUrl = new URL(emailPasswordLink);
        assert(currentUrl.origin === "http://localhost:3000");

        await new Promise((resolve) =>
            request(app)
                .post("/auth/user/password/reset/token")
                .set("origin", "localhost:3002")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                    ],
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

        currentUrl = new URL(emailPasswordLink);
        assert(currentUrl.origin === "http://localhost:3002");
    });

    it("test the reset password link", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    return "localhost:3000";
                },
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        user = await EmailPassword.signUp("public", "test@example.com", "password1234");
        link = await createResetPasswordLink("public", user.user.id, "test@example.com");
        assert(link !== undefined);
        assert(link.status === "OK");

        parsed = url.parse(link.link, true);

        assert(parsed.pathname === "/auth/reset-password");
        assert(parsed.query.token !== undefined);
        assert(parsed.query.rid === "emailpassword");
        assert(parsed.query.tenantId === "public");
    });

    it("test the reset password link for invalid input", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    return "localhost:3000";
                },
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let link = await createResetPasswordLink("public", "invlidUserId", "test@example.com");
        assert(link !== undefined);
        assert(link.status === "UNKNOWN_USER_ID_ERROR");

        try {
            link = await createResetPasswordLink("invalidTenantId", "invlidUserId", "test@example.com");
        } catch (err) {
            isErr = true;
            assert(err.message.includes("status code: 400"));
        }
        assert(isErr);
    });

    it("test sendResetPasswordEmail", async function () {
        const connectionURI = await startST();
        let emailPasswordLink = "";
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    return "localhost:3000";
                },
            },
            recipeList: [
                EmailPassword.init({
                    emailDelivery: {
                        override: (original) => {
                            return {
                                ...original,
                                sendEmail: async (input) => {
                                    emailPasswordLink = input.passwordResetLink;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        user = await EmailPassword.signUp("public", "test@example.com", "password1234");
        resp = await sendResetPasswordEmail("public", user.user.id, "test@example.com");
        assert(resp !== undefined);
        assert(resp.status === "OK");

        parsed = url.parse(emailPasswordLink, true);

        assert(parsed.pathname === "/auth/reset-password");
        assert(parsed.query.token !== undefined);
        assert(parsed.query.rid === "emailpassword");
        assert(parsed.query.tenantId === "public");
    });

    it("test sendResetPasswordEmail: invalid input", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ request }) => {
                    return "localhost:3000";
                },
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        resp = await sendResetPasswordEmail("public", "invalidUserID", "test@example.com");
        assert(resp !== undefined);
        assert(resp.status === "UNKNOWN_USER_ID_ERROR");

        user = await EmailPassword.signUp("public", "test@example.com", "password1234");

        try {
            await sendResetPasswordEmail("invalidTenantID", user.user.id, "test@example.com");
        } catch (err) {
            isErr = true;
            assert(err.message.includes("status code: 400"));
        }
        assert(isErr);
    });
});
