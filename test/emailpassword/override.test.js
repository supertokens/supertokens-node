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
    createServerlessCacheForTesting,
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let utils = require("../../lib/build/recipe/emailpassword/utils");
const { removeServerlessCache } = require("../../lib/build/utils");
const express = require("express");
const request = require("supertest");

describe(`overrideTest: ${printPath("[test/emailpassword/override.test.js]")}`, function () {
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

    it("overriding functions tests", async () => {
        await startST();
        let user = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init({
                override: {
                    functions: (oI) => {
                        return {
                            ...oI,
                            signUp: async (input) => {
                                let response = await oI.signUp(input);
                                if (response.status === "OK") {
                                    user = response.user;
                                }
                                return response;
                            },
                            signIn: async (input) => {
                                let response = await oI.signIn(input);
                                if (response.status === "OK") {
                                    user = response.user;
                                }
                                return response;
                            },
                            getUserById: async (input) => {
                                let response = await oI.getUserById(input);
                                user = response;
                                return response;
                            }
                        }
                    }
                }
            }), Session.init()],
        });

        let app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            res.json(await EmailPassword.getUserById(userId));
        })

        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.deepStrictEqual(signUpResponse.body.user, user);
        
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
        assert.deepStrictEqual(signInResponse.user, user);

        user = undefined;
        assert.strictEqual(user, undefined);

        let userByIdResponse = await new Promise((resolve) =>
                request(app)
                    .get("/user")
                    .query({
                        userId: signInResponse.user.id
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
        assert.deepStrictEqual(userByIdResponse, user);
    });

    it("overriding api tests", async () => {
        await startST();
        let user = undefined;
        let emailExists = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init({
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            signUpPOST: async (input) => {
                                let response = await oI.signUpPOST(input);
                                if (response.status === "OK") {
                                    user = response.user;
                                }
                                return response;
                            },
                            signInPOST: async (input) => {
                                let response = await oI.signInPOST(input);
                                if (response.status === "OK") {
                                    user = response.user;
                                }
                                return response;
                            },
                            emailExistsGET: async (input) => {
                                let response = await oI.emailExistsGET(input);
                                emailExists = response.exists;
                                return response;
                            }
                        }
                    }
                }
            }), Session.init()],
        });

        let app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            res.json(await EmailPassword.getUserById(userId));
        })

        let emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "user@test.com"
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
        assert.deepStrictEqual(signUpResponse.body.user, user);

        emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "user@test.com"
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
        assert.deepStrictEqual(signInResponse.user, user);
    });

    it("overriding functions tests, throws error", async () => {
        await startST();
        let user = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init({
                override: {
                    functions: (oI) => {
                        return {
                            ...oI,
                            signUp: async (input) => {
                                let response = await oI.signUp(input);
                                user = response.user;
                                throw {
                                    error: "signup error"
                                };
                            },
                            signIn: async (input) => {
                                await oI.signIn(input);
                                throw {
                                    error: "signin error"
                                };
                            },
                            getUserById: async (input) => {
                                await oI.getUserById(input);
                                throw {
                                    error: "get user error"
                                };
                            }
                        }
                    }
                }
            }), Session.init()],
        });

        let app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.get("/user", async (req, res, next) => {
            try {
                let userId = req.query.userId;
                res.json(await EmailPassword.getUserById(userId));
            } catch (err) {
                next(err);
            }
        })

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true
            });
        });

        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.deepStrictEqual(signUpResponse.body, {error: "signup error", customError: true});
        
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
        
        assert.deepStrictEqual(signInResponse, {error: "signin error", customError: true});

        let userByIdResponse = await new Promise((resolve) =>
                request(app)
                    .get("/user")
                    .query({
                        userId: user.id
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

        assert.deepStrictEqual(userByIdResponse, {error: "get user error", customError: true});
    });

    it("overriding api tests, throws error", async () => {
        await startST();
        let user = undefined;
        let emailExists = undefined;
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init({
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            signUpPOST: async (input) => {
                                let response = await oI.signUpPOST(input);
                                user = response.user;
                                throw {
                                    error: "signup error"
                                };
                            },
                            signInPOST: async (input) => {
                                await oI.signInPOST(input);
                                throw {
                                    error: "signin error"
                                };
                            },
                            emailExistsGET: async (input) => {
                                let response = await oI.emailExistsGET(input);
                                emailExists = response.exists;
                                throw {
                                    error: "email exists error"
                                };
                            }
                        }
                    }
                }
            }), Session.init()],
        });

        let app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        app.get("/user", async (req, res) => {
            let userId = req.query.userId;
            res.json(await EmailPassword.getUserById(userId));
        });

        app.use((err, req, res, next) => {
            res.json({
                ...err,
                customError: true
            });
        });

        let emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "user@test.com"
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
        assert.deepStrictEqual(emailExistsResponse, {error: "email exists error", customError: true});
        assert.strictEqual(emailExists, false);
        let signUpResponse = await signUPRequest(app, "user@test.com", "test123!");

        assert.notStrictEqual(user, undefined);
        assert.deepStrictEqual(signUpResponse.body, {error: "signup error", customError: true});

        emailExistsResponse = await new Promise((resolve) =>
                request(app)
                    .get("/auth/signup/email/exists")
                    .query({
                        email: "user@test.com"
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
        assert.deepStrictEqual(emailExistsResponse, {error: "email exists error", customError: true});
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
        
        assert.deepStrictEqual(signInResponse, {error: "signin error", customError: true});
    });
});