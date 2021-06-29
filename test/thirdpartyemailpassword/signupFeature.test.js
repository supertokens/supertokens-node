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
    killAllST,
    cleanST,
    createServerlessCacheForTesting,
    signUPRequest,
} = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPasswordRecipe = require("../../lib/build/recipe/thirdpartyemailpassword/recipe").default;
let ThirdPartyEmailPassword = require("../../lib/build/recipe/thirdpartyemailpassword");
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
const { removeServerlessCache } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { maxVersion } = require("../../lib/build/utils");

describe(`signupTest: ${printPath("[test/thirdpartyemailpassword/signupFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
        this.customProvider2 = {
            id: "custom",
            get: async (recipe, authCode) => {
                throw new Error("error from get function");
            },
        };
        this.customProvider3 = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                        };
                    },
                };
            },
        };
        this.customProvider4 = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        throw new Error("error from getProfileInfo");
                    },
                };
            },
        };
        this.customProvider5 = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: false,
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
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test that disable api, the default signinup API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: undefined,
                            };
                        },
                    },
                    providers: [
                        ThirdPartyEmailPassword.Google({
                            clientId: "test",
                            clientSecret: "test-secret",
                        }),
                    ],
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.status, 404);
    });

    it("test that if disable api, the default signup API does not work", async function () {
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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: undefined,
                            };
                        },
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 404);
    });

    it("test minimum config with one provider", async function () {
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
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").times(1).reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response1, undefined);
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.body.createdNewUser, true);
        assert.strictEqual(response1.body.user.thirdParty.id, "custom");
        assert.strictEqual(response1.body.user.thirdParty.userId, "user");
        assert.strictEqual(response1.body.user.email, "email@test.com");

        assert.strictEqual(
            await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError().isEmailVerified(response1.body.user.id),
            true
        );
    });

    it("test signUpAPI works when input is fine", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.email === "random@gmail.com");
    });

    it("test handlePostSignUpIn gets set correctly", async function () {
        await startST();

        process.env.userId = "";
        process.env.loginType = "";

        assert.strictEqual(process.env.userId, "");
        assert.strictEqual(process.env.loginType, "");

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
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: async (input) => {
                                    let response = await oI.signInUpPOST(input);
                                    if (response.status === "OK") {
                                        process.env.userId = response.user.id;
                                        process.env.loginType = input.type;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").times(1).reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.strictEqual(process.env.userId, response1.body.user.id);
        assert.strictEqual(process.env.loginType, "thirdparty");
    });

    it("test handlePostSignUp gets set correctly", async function () {
        await startST();

        process.env.userId = "";
        process.env.loginType = "";

        assert.strictEqual(process.env.userId, "");
        assert.strictEqual(process.env.loginType, "");

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
                ThirdPartyEmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: async (input) => {
                                    let response = await oI.signInUpPOST(input);
                                    if (response.status === "OK") {
                                        process.env.userId = response.user.id;
                                        process.env.loginType = input.type;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert.strictEqual(process.env.userId, userInfo.id);
        assert.strictEqual(process.env.loginType, "emailpassword");
    });

    // will test that the error is correctly propagated to the required sub-recipe
    it("test signUpAPI throws an error in case of a duplicate email (emailpassword)", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userInfo = JSON.parse(response.text).user;
        assert(userInfo.id !== undefined);
        assert(userInfo.email === "random@gmail.com");

        response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(response.status === 200);
        let responseInfo = JSON.parse(response.text);

        assert(responseInfo.status === "FIELD_ERROR");
        assert(responseInfo.formFields.length === 1);
        assert(responseInfo.formFields[0].id === "email");
        assert(responseInfo.formFields[0].error === "This email already exists. Please sign in instead.");
    });

    // testing 500 status response thrown from sub-recipe
    it("test provider get function throws error", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider2],
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.use((err, request, response, next) => {
            response.status(500).send({
                message: err.message,
            });
        });

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 500);
        assert.deepStrictEqual(response1.body, { message: "error from get function" });
    });

    // NO_EMAIL_GIVEN_BY_PROVIDER thrown from sub recipe
    it("test email not returned in getProfileInfo function", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider3],
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 200);
        assert.strictEqual(response1.body.status, "NO_EMAIL_GIVEN_BY_PROVIDER");
    });

    it("test error thrown from getProfileInfo function", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider4],
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.use((err, request, response, next) => {
            response.status(500).send({
                message: err.message,
            });
        });

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.statusCode, 500);
        assert.deepStrictEqual(response1.body, { message: "error from getProfileInfo" });
    });

    it("test getUserById when user does not exist", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                }),
                Session.init(),
            ],
        });

        let thirdPartyRecipe = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();

        assert.strictEqual(await ThirdPartyEmailPassword.getUserById("randomID"), undefined);

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                    redirectURI: "http://localhost.org",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.statusCode, 200);

        let signUpUserInfo = response.body.user;
        let userInfo = await ThirdPartyEmailPassword.getUserById(signUpUserInfo.id);

        assert.strictEqual(userInfo.email, signUpUserInfo.email);
        assert.strictEqual(userInfo.id, signUpUserInfo.id);
    });

    it("test getUserByThirdPartyInfo when user does not exist", async function () {
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
                ThirdPartyEmailPassword.init({
                    providers: [this.customProvider1],
                }),
                Session.init(),
            ],
        });

        let thirdPartyRecipe = ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError();

        assert.strictEqual(await ThirdPartyEmailPassword.getUserByThirdPartyInfo("custom", "user"), undefined);

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "32432432",
                    redirectURI: "http://localhost.org",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.statusCode, 200);

        let signUpUserInfo = response.body.user;
        let userInfo = await ThirdPartyEmailPassword.getUserByThirdPartyInfo("custom", "user");

        assert.strictEqual(userInfo.email, signUpUserInfo.email);
        assert.strictEqual(userInfo.id, signUpUserInfo.id);
    });

    it("test getUserCount and pagination works fine", async function () {
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
            recipeList: [ThirdPartyEmailPassword.init(), Session.init()],
        });

        let currCDIVersion = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
        if (maxVersion(currCDIVersion, "2.7") === "2.7") {
            // we don't run the tests below for older versions of the core since it
            // was introduced in >= 2.8 CDI
            return;
        }

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        assert((await STExpress.getUserCount()) === 0);

        await signUPRequest(app, "random@gmail.com", "validpass123");

        assert((await STExpress.getUserCount()) === 1);
        assert((await STExpress.getUserCount(["emailpassword"])) === 1);
        assert((await STExpress.getUserCount(["emailpassword", "thirdparty"])) === 1);

        await ThirdPartyEmailPassword.signInUp("google", "randomUserId", {
            id: "test@example.com",
            isVerified: false,
        });

        assert((await STExpress.getUserCount()) === 2);
        assert((await STExpress.getUserCount(["emailpassword"])) === 1);
        assert((await STExpress.getUserCount(["thirdparty"])) === 1);
        assert((await STExpress.getUserCount(["emailpassword", "thirdparty"])) === 2);

        await signUPRequest(app, "random1@gmail.com", "validpass123");

        let usersOldest = await STExpress.getUsersOldestFirst();
        assert(usersOldest.nextPaginationToken === undefined);
        assert(usersOldest.users.length === 3);
        assert(usersOldest.users[0].recipeId === "emailpassword");
        assert(usersOldest.users[0].user.email === "random@gmail.com");

        let usersNewest = await STExpress.getUsersNewestFirst({
            limit: 2,
        });
        assert(usersNewest.nextPaginationToken !== undefined);
        assert(usersNewest.users.length === 2);
        assert(usersNewest.users[0].recipeId === "emailpassword");
        assert(usersNewest.users[0].user.email === "random1@gmail.com");

        let usersNewest2 = await STExpress.getUsersNewestFirst({
            paginationToken: usersNewest.nextPaginationToken,
        });
        assert(usersNewest2.nextPaginationToken === undefined);
        assert(usersNewest2.users.length === 1);
        assert(usersNewest2.users[0].recipeId === "emailpassword");
        assert(usersNewest2.users[0].user.email === "random@gmail.com");
    });
});
