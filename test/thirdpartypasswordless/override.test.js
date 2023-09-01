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
    isCDIVersionCompatible,
    assertJSONEquals,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
const { Querier } = require("../../lib/build/querier");
let ThirdPartyPasswordless = require("../../recipe/thirdpartypasswordless");
const express = require("express");
const request = require("supertest");
let nock = require("nock");
let { middleware, errorHandler } = require("../../framework/express");
let AccountLinking = require("../../recipe/accountlinking");

describe(`overrideTest: ${printPath("[test/thirdpartypasswordless/override.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            config: {
                thirdPartyId: "custom",
                authorizationEndpoint: "https://test.com/oauth/auth",
                tokenEndpoint: "https://test.com/oauth/token",
                clients: [{ clientId: "supetokens", clientSecret: "secret", scope: ["test"] }],
            },
            override: (oI) => {
                return {
                    ...oI,
                    getUserInfo: async function (oAuthTokens) {
                        return {
                            thirdPartyUserId: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("overriding functions tests", async function () {
        const connectionURI = await startST();
        let user = undefined;
        let newUser = undefined;
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUp: async (input) => {
                                    let response = await oI.thirdPartySignInUp(input);
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
                                    newUser = response.createdNewRecipeUser;
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            let user = await STExpress.getUser(userId);
            user.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();
            res.json(user);
        });

        let signUpResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, true);
        assertJSONEquals(signUpResponse.user, user);

        user = undefined;
        assert.strictEqual(user, undefined);

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
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
        assertJSONEquals(signInResponse.user, user);

        user = undefined;
        assert.strictEqual(user, undefined);

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

    it("overriding api tests", async function () {
        const connectionURI = await startST();
        let user = undefined;
        let newUser = undefined;
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: async (input) => {
                                    let response = await oI.thirdPartySignInUpPOST(input);
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
                                        newUser = response.createdNewRecipeUser;
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

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        let signUpResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, true);
        assertJSONEquals(signUpResponse.user, user);

        user = undefined;
        assert.strictEqual(user, undefined);

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
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
        assertJSONEquals(signInResponse.user, user);
    });

    it("overriding functions tests, throws error", async function () {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [this.customProvider1],
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUp: async (input) => {
                                    let response = await oI.thirdPartySignInUp(input);
                                    user = response.user;
                                    newUser = response.createdNewRecipeUser;
                                    if (newUser) {
                                        throw {
                                            error: "signup error",
                                        };
                                    }
                                    throw {
                                        error: "signin error",
                                    };
                                },
                                getUserById: async (input) => {
                                    await oI.getUserById(input);
                                    throw {
                                        error: "get user error",
                                    };
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

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

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true,
            });
        });

        let signUpResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assert.deepStrictEqual(signUpResponse, { error: "signup error", customError: true });

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
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

    it("overriding api tests, throws error", async function () {
        const connectionURI = await startST();
        let user = undefined;
        let newUser = undefined;
        let emailExists = undefined;
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
                ThirdPartyPasswordless.init({
                    providers: [this.customProvider1],
                    contactMethod: "EMAIL",
                    emailDelivery: {
                        sendEmail: async (input) => {
                            return;
                        },
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                thirdPartySignInUpPOST: async (input) => {
                                    let response = await oI.thirdPartySignInUpPOST(input);
                                    user = response.user;
                                    newUser = response.createdNewRecipeUser;
                                    if (newUser) {
                                        throw {
                                            error: "signup error",
                                        };
                                    }
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

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        let app = express();

        app.use(middleware());

        app.use(errorHandler());

        nock("https://test.com").post("/oauth/token").times(2).reply(200, {});

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true,
            });
        });

        let signUpResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.notStrictEqual(user, undefined);
        assert.strictEqual(newUser, true);
        assert.deepStrictEqual(signUpResponse, { error: "signup error", customError: true });

        let signInResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err.response.body);
                    } else {
                        resolve(res.body);
                    }
                })
        );

        assert.strictEqual(newUser, false);
        assert.deepStrictEqual(signInResponse, { error: "signin error", customError: true });
    });
});
