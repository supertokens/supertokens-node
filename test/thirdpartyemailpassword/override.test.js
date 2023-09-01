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
const {
    printPath,
    setupST,
    startST,
    stopST,
    killAllST,
    cleanST,
    resetAll,
    signUPRequest,
    assertJSONEquals,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const { Querier } = require("../../lib/build/querier");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let AccountLinking = require("../../recipe/accountlinking");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

describe(`overrideTest: ${printPath("[test/thirdpartyemailpassword/override.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("overriding functions tests", async () => {
        const connectionURI = await startST();
        let user = undefined;
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
                AccountLinking.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                getUser: async (input) => {
                                    let response = await oI.getUser(input);
                                    if (response !== undefined) {
                                        user = {
                                            ...response,
                                            loginMethods: [
                                                {
                                                    ...response.loginMethods[0],
                                                    recipeUserId: response.loginMethods[0].recipeUserId.getAsString(),
                                                },
                                            ],
                                        };
                                        delete user.loginMethods[0].hasSameEmailAs;
                                        delete user.loginMethods[0].hasSamePhoneNumberAs;
                                        delete user.loginMethods[0].hasSameThirdPartyInfoAs;
                                        delete user.toJson;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                ThirdPartyEmailPassword.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignUp: async (input) => {
                                    let response = await oI.emailPasswordSignUp(input);
                                    if (response.status === "OK") {
                                        user = {
                                            ...response.user,
                                            loginMethods: [
                                                {
                                                    ...response.user.loginMethods[0],
                                                    recipeUserId: response.user.loginMethods[0].recipeUserId.getAsString(),
                                                },
                                            ],
                                        };
                                        delete user.loginMethods[0].hasSameEmailAs;
                                        delete user.loginMethods[0].hasSamePhoneNumberAs;
                                        delete user.loginMethods[0].hasSameThirdPartyInfoAs;
                                        delete user.toJson;
                                    }
                                    return response;
                                },
                                emailPasswordSignIn: async (input) => {
                                    let response = await oI.emailPasswordSignIn(input);
                                    if (response.status === "OK") {
                                        user = {
                                            ...response.user,
                                            loginMethods: [
                                                {
                                                    ...response.user.loginMethods[0],
                                                    recipeUserId: response.user.loginMethods[0].recipeUserId.getAsString(),
                                                },
                                            ],
                                        };
                                        delete user.loginMethods[0].hasSameEmailAs;
                                        delete user.loginMethods[0].hasSamePhoneNumberAs;
                                        delete user.loginMethods[0].hasSameThirdPartyInfoAs;
                                        delete user.toJson;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            let user = await STExpress.getUser(userId);
            user.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();
            res.json(user);
        });

        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assertJSONEquals(signUpResponse.body.user, user);

        user = undefined;

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "test123!",
                        },
                        {
                            id: "email",
                            value: "user@test.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assertJSONEquals(signInResponse.user, user);

        user = undefined;

        let userByIdResponse = await new Promise((resolve) =>
            request(app)
                .get("/user")
                .query({
                    userId: signInResponse.user.id,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assertJSONEquals(userByIdResponse, user);
    });

    it("overriding api tests", async () => {
        const connectionURI = await startST();
        let user = undefined;
        let newUser = undefined;
        let emailExists = undefined;
        let type = undefined;
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignInPOST: async (input) => {
                                    let response = await oI.emailPasswordSignInPOST(input);
                                    if (response.status === "OK") {
                                        user = {
                                            ...response.user,
                                            loginMethods: [
                                                {
                                                    ...response.user.loginMethods[0],
                                                    recipeUserId: response.user.loginMethods[0].recipeUserId.getAsString(),
                                                },
                                            ],
                                        };
                                        delete user.loginMethods[0].hasSameEmailAs;
                                        delete user.loginMethods[0].hasSamePhoneNumberAs;
                                        delete user.loginMethods[0].hasSameThirdPartyInfoAs;
                                        delete user.toJson;
                                        newUser = false;
                                        type = "emailpassword";
                                    }
                                    return response;
                                },
                                emailPasswordSignUpPOST: async (input) => {
                                    let response = await oI.emailPasswordSignUpPOST(input);
                                    if (response.status === "OK") {
                                        user = {
                                            ...response.user,
                                            loginMethods: [
                                                {
                                                    ...response.user.loginMethods[0],
                                                    recipeUserId: response.user.loginMethods[0].recipeUserId.getAsString(),
                                                },
                                            ],
                                        };
                                        delete user.loginMethods[0].hasSameEmailAs;
                                        delete user.loginMethods[0].hasSamePhoneNumberAs;
                                        delete user.loginMethods[0].hasSameThirdPartyInfoAs;
                                        delete user.toJson;
                                        newUser = true;
                                        type = "emailpassword";
                                    }
                                    return response;
                                },
                                emailPasswordEmailExistsGET: async (input) => {
                                    let response = await oI.emailPasswordEmailExistsGET(input);
                                    emailExists = response.exists;
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            res.json(await STExpress.getUser(userId));
        });

        let emailExistsResponse = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists")
                .query({
                    email: "user@test.com",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert.strictEqual(emailExistsResponse.exists, false);
        assert.strictEqual(emailExists, false);
        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, true);
        assert.strictEqual(type, "emailpassword");
        assertJSONEquals(signUpResponse.body.user, user);

        emailExistsResponse = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists")
                .query({
                    email: "user@test.com",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert.strictEqual(emailExistsResponse.exists, true);
        assert.strictEqual(emailExists, true);

        user = undefined;
        assert.strictEqual(user, undefined);

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "test123!",
                        },
                        {
                            id: "email",
                            value: "user@test.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, false);
        assert.strictEqual(type, "emailpassword");
        assertJSONEquals(signInResponse.user, user);
    });

    it("overriding functions tests, throws error", async () => {
        const connectionURI = await startST();
        let user = undefined;
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
                AccountLinking.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                getUser: async (input) => {
                                    let response = await oI.getUser(input);
                                    if (input.userContext.shouldError === undefined) {
                                        return response;
                                    }
                                    throw {
                                        error: "get user error",
                                    };
                                },
                            };
                        },
                    },
                }),
                ThirdPartyEmailPassword.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignUp: async (input) => {
                                    let response = await oI.emailPasswordSignUp(input);
                                    user = response.user;
                                    throw {
                                        error: "signup error",
                                    };
                                },
                                emailPasswordSignIn: async (input) => {
                                    await oI.emailPasswordSignIn(input);
                                    throw {
                                        error: "signin error",
                                    };
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.get("/user", async (req, res, next) => {
            try {
                let userId = req.query.userId;
                res.json(await STExpress.getUser(userId, { shouldError: true }));
            } catch (err) {
                next(err);
            }
        });

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true,
            });
        });

        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.deepStrictEqual(signUpResponse.body, { error: "signup error", customError: true });

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "test123!",
                        },
                        {
                            id: "email",
                            value: "user@test.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.deepStrictEqual(signInResponse, { error: "signin error", customError: true });

        let userByIdResponse = await new Promise((resolve) =>
            request(app)
                .get("/user")
                .query({
                    userId: user.id,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.deepStrictEqual(userByIdResponse, { error: "get user error", customError: true });
    });

    it("overriding api tests, throws error", async () => {
        const connectionURI = await startST();
        let user = undefined;
        let newUser = undefined;
        let emailExists = undefined;
        let type = undefined;
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                emailPasswordSignInPOST: async (input) => {
                                    let response = await oI.emailPasswordSignInPOST(input);
                                    user = response.user;
                                    newUser = false;
                                    type = "emailpassword";
                                    if (newUser) {
                                        throw {
                                            error: "signup error",
                                        };
                                    }
                                    throw {
                                        error: "signin error",
                                    };
                                },
                                emailPasswordSignUpPOST: async (input) => {
                                    let response = await oI.emailPasswordSignUpPOST(input);
                                    user = response.user;
                                    newUser = true;
                                    type = "emailpassword";
                                    if (newUser) {
                                        throw {
                                            error: "signup error",
                                        };
                                    }
                                    throw {
                                        error: "signin error",
                                    };
                                },
                                emailPasswordEmailExistsGET: async (input) => {
                                    let response = await oI.emailPasswordEmailExistsGET(input);
                                    emailExists = response.exists;
                                    throw {
                                        error: "email exists error",
                                    };
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            res.json(await SuperTokens.getUser(userId));
        });

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true,
            });
        });

        let emailExistsResponse = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists")
                .query({
                    email: "user@test.com",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert.deepStrictEqual(emailExistsResponse, { error: "email exists error", customError: true });
        assert.strictEqual(emailExists, false);
        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, true);
        assert.strictEqual(type, "emailpassword");
        assert.deepStrictEqual(signUpResponse.body, { error: "signup error", customError: true });

        emailExistsResponse = await new Promise((resolve) =>
            request(app)
                .get("/auth/signup/email/exists")
                .query({
                    email: "user@test.com",
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert.deepStrictEqual(emailExistsResponse, { error: "email exists error", customError: true });
        assert.strictEqual(emailExists, true);

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "test123!",
                        },
                        {
                            id: "email",
                            value: "user@test.com",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.strictEqual(newUser, false);
        assert.deepStrictEqual(signInResponse, { error: "signin error", customError: true });
    });
});
