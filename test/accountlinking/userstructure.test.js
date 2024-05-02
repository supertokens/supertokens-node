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
    assertJSONEquals,
    startSTWithMultitenancyAndAccountLinking,
    extractInfoFromResponse,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let Passwordless = require("../../recipe/passwordless");
let AccountLinking = require("../../recipe/accountlinking");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/userstructure.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("hasSameEmailAs function in user object work", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init()],
        });

        let { user } = await EmailPassword.signUp("public", "test@example.com", "password123");

        assert(user.loginMethods[0].hasSameEmailAs("test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs(" Test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs("test@examplE.com"));
        assert(!user.loginMethods[0].hasSameEmailAs("t2est@examplE.com"));
    });

    it("toJson works as expected", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init()],
        });

        let { user } = await EmailPassword.signUp("public", "test@example.com", "password123");

        let jsonifiedUser = user.toJson();

        user.loginMethods[0].recipeUserId = user.loginMethods[0].recipeUserId.getAsString();
        assertJSONEquals(jsonifiedUser, user);
    });

    it("hasSameThirdPartyInfoAs function in user object work", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
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

        let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
            "public",
            "google",
            "abcd",
            "test@example.com",
            false
        );

        assert(user.loginMethods[0].hasSameEmailAs("test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs(" Test@example.com"));
        assert(user.loginMethods[0].hasSameEmailAs("test@examplE.com"));
        assert(!user.loginMethods[0].hasSameEmailAs("t2est@examplE.com"));

        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google",
                userId: "abcd",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google ",
                userId: " abcd",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " google ",
                userId: "abcd ",
            })
        );
        assert(
            user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " google",
                userId: "   abcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: " gOogle",
                userId: "aBcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "abc",
                userId: "abcd",
            })
        );
        assert(
            !user.loginMethods[0].hasSameThirdPartyInfoAs({
                id: "google",
                userId: "aabcd",
            })
        );
    });

    it("hasSamePhoneNumberAs function in user object work", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Passwordless.init({
                    contactMethod: "PHONE",
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
            ],
        });

        const { status, user } = await Passwordless.signInUp({ tenantId: "public", phoneNumber: "+36701234123" });

        assert.strictEqual(status, "OK");

        assert(user.loginMethods[0].hasSamePhoneNumberAs("+36701234123"));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36701234123 \t       "));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36-70/1234 123 \t       "));
        assert(user.loginMethods[0].hasSamePhoneNumberAs("      \t+36-70/1234-123 \t       "));
        // TODO: validate these cases should map to false
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("36701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("0036701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("06701234123"));
        assert(!user.loginMethods[0].hasSamePhoneNumberAs("p36701234123"));
    });

    it("user structure FDI 1.17 is correctly returned even if session does not match logged in user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
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
                Session.init({
                    overwriteSessionDuringSignInUp: false,
                }),
            ],
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        let { user, status } = await EmailPassword.signUp("public", "test@example.com", "password123");
        assert(status === "OK");

        let res = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.17")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
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

        let tokens = extractInfoFromResponse(res);
        assert(tokens.accessTokenFromAny !== undefined);

        // now we sign up a new user with another email, but with the older session.
        let signUp2 = await EmailPassword.signUp("public", "test2@example.com", "password123");
        assert(signUp2.status === "OK");
        let linkingResult = await AccountLinking.createPrimaryUser(signUp2.user.loginMethods[0].recipeUserId);
        assert(linkingResult.status === "OK");

        let signUp3 = await EmailPassword.signUp("public", "test3@example.com", "password123");
        assert(signUp3.status === "OK");
        linkingResult = await AccountLinking.linkAccounts(signUp3.user.loginMethods[0].recipeUserId, signUp2.user.id);
        assert(linkingResult.status === "OK");

        res = await request(app)
            .post("/auth/signin")
            .set("fdi-version", "1.17")
            .set("Authorization", `Bearer ${tokens.accessTokenFromAny}`)
            .send({
                formFields: [
                    {
                        id: "email",
                        value: "test3@example.com",
                    },
                    {
                        id: "password",
                        value: "password123",
                    },
                ],
            })
            .expect(200);

        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual(res.body.user.email, "test2@example.com");
        assert.strictEqual(res.body.user.id, signUp2.user.id);
        assert.strictEqual(res.body.user.timeJoined, signUp2.user.timeJoined);
        assert.strictEqual(Object.keys(res.body.user).length, 3);

        let tokens2 = extractInfoFromResponse(res);
        assert.strictEqual(tokens2.accessTokenFromAny, undefined);
    });

    it("user structure FDI 1.16,1.17 is correctly returned even if session does not match logged in user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
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
                Session.init({
                    overwriteSessionDuringSignInUp: false,
                }),
            ],
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        let { user, status } = await EmailPassword.signUp("public", "test@example.com", "password123");
        assert(status === "OK");

        let res = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.16,1.17")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
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

        let tokens = extractInfoFromResponse(res);
        assert(tokens.accessTokenFromAny !== undefined);

        // now we sign up a new user with another email, but with the older session.
        let signUp2 = await EmailPassword.signUp("public", "test2@example.com", "password123");
        assert(signUp2.status === "OK");
        let linkingResult = await AccountLinking.createPrimaryUser(signUp2.user.loginMethods[0].recipeUserId);
        assert(linkingResult.status === "OK");

        let signUp3 = await EmailPassword.signUp("public", "test3@example.com", "password123");
        assert(signUp3.status === "OK");
        linkingResult = await AccountLinking.linkAccounts(signUp3.user.loginMethods[0].recipeUserId, signUp2.user.id);
        assert(linkingResult.status === "OK");

        {
            res = await request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.16,1.17")
                .set("Authorization", `Bearer ${tokens.accessTokenFromAny}`)
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test3@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
                        },
                    ],
                })
                .expect(200);

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.user.email, "test2@example.com");
            assert.strictEqual(res.body.user.id, signUp2.user.id);
            assert.strictEqual(res.body.user.timeJoined, signUp2.user.timeJoined);
            assert.strictEqual(Object.keys(res.body.user).length, 3);

            let tokens2 = extractInfoFromResponse(res);
            assert.strictEqual(tokens2.accessTokenFromAny, undefined);
        }
        {
            res = await request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.17,1.16")
                .set("Authorization", `Bearer ${tokens.accessTokenFromAny}`)
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test3@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
                        },
                    ],
                })
                .expect(200);

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.user.email, "test2@example.com");
            assert.strictEqual(res.body.user.id, signUp2.user.id);
            assert.strictEqual(res.body.user.timeJoined, signUp2.user.timeJoined);
            assert.strictEqual(Object.keys(res.body.user).length, 3);

            let tokens2 = extractInfoFromResponse(res);
            assert.strictEqual(tokens2.accessTokenFromAny, undefined);
        }
    });

    it("user structure FDI 1.17,1.18 is correctly returned even if session does not match logged in user", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
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
                Session.init({
                    overwriteSessionDuringSignInUp: false,
                }),
            ],
        });

        const app = express();
        app.use(middleware());
        app.use(errorHandler());

        let { user, status } = await EmailPassword.signUp("public", "test@example.com", "password123");
        assert(status === "OK");

        let res = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.18,1.17")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
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

        let tokens = extractInfoFromResponse(res);
        assert(tokens.accessTokenFromAny !== undefined);

        // now we sign up a new user with another email, but with the older session.
        let signUp2 = await EmailPassword.signUp("public", "test2@example.com", "password123");
        assert(signUp2.status === "OK");
        let linkingResult = await AccountLinking.createPrimaryUser(signUp2.user.loginMethods[0].recipeUserId);
        assert(linkingResult.status === "OK");

        let signUp3 = await EmailPassword.signUp("public", "test3@example.com", "password123");
        assert(signUp3.status === "OK");
        linkingResult = await AccountLinking.linkAccounts(signUp3.user.loginMethods[0].recipeUserId, signUp2.user.id);
        assert(linkingResult.status === "OK");

        {
            res = await request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.18,1.17")
                .set("Authorization", `Bearer ${tokens.accessTokenFromAny}`)
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test3@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
                        },
                    ],
                })
                .expect(200);

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.user.emails[1], "test2@example.com"); // new structure
        }
        {
            res = await request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.17,1.18")
                .set("Authorization", `Bearer ${tokens.accessTokenFromAny}`)
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test3@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
                        },
                    ],
                })
                .expect(200);

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.user.emails[1], "test2@example.com"); // new structure
        }
    });

    it("user structure FDI 1.17 is correctly returned based on session user ID", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();
        supertokens.init({
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

        let signUp2 = await EmailPassword.signUp("public", "test2@example.com", "password123");
        assert(signUp2.status === "OK");
        let linkingResult = await AccountLinking.createPrimaryUser(signUp2.user.loginMethods[0].recipeUserId);
        assert(linkingResult.status === "OK");

        let signUp3 = await EmailPassword.signUp("public", "test3@example.com", "password123");
        assert(signUp3.status === "OK");
        linkingResult = await AccountLinking.linkAccounts(signUp3.user.loginMethods[0].recipeUserId, signUp2.user.id);
        assert(linkingResult.status === "OK");

        res = await new Promise((resolve) =>
            request(app)
                .post("/auth/signin")
                .set("fdi-version", "1.17")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test3@example.com",
                        },
                        {
                            id: "password",
                            value: "password123",
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
        assert(res.body.status === "OK");
        assert(res.body.user.email === "test3@example.com");
        assert(res.body.user.id === signUp2.user.id);
        assert(res.body.user.timeJoined === signUp3.user.timeJoined);
        assert(Object.keys(res.body.user).length === 3);
    });
});
