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
const { printPath, setupST, startST, killAllST, cleanST, resetAll } = require("./utils");
let { ProcessState } = require("../lib/build/processState");
let ST = require("../");
let Session = require("../recipe/session");
let { Querier } = require("../lib/build/querier");
let RecipeModule = require("../lib/build/recipeModule").default;
let NormalisedURLPath = require("../lib/build/normalisedURLPath").default;
let STError = require("../lib/build/error").default;
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let EmailPassword = require("../recipe/emailpassword");
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
const express = require("express");
const assert = require("assert");
const request = require("supertest");
let { middleware, errorHandler } = require("../framework/express");

/**
 *
 * TODO: Create a recipe with two APIs that have the same path and method, and see it throw an error.
 * TODO: (later) If a recipe has a callback and a user implements it, but throws a normal error from it, then we need to make sure that that error is caught only by their error handler
 * TODO: (later) Make a custom validator throw an error and check that it's transformed into a general error, and then in user's error handler, it's a normal error again
 *
 */

describe(`recipeModuleManagerTest: ${printPath("[test/recipeModuleManager.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        resetTestRecipies();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("calling init multiple times", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailPassword.init(),
            ],
        });

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailPassword.init(),
            ],
        });
    });

    // Check that querier has been inited when we call supertokens.init
    // Failure condition: initalizing supertoknes before the the first try catch will fail the test
    it("test that querier has been initiated when we call supertokens.init", async function () {
        const connectionURI = await startST();

        try {
            await Querier.getNewInstanceOrThrowError(undefined);
            assert(false);
        } catch (err) {
            if (err.message !== "Please call the supertokens.init function before using SuperTokens") {
                throw err;
            }
        }

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        await Querier.getNewInstanceOrThrowError(undefined);
    });

    // Check that modules have been inited when we call supertokens.init
    // Failure condition: initalizing supertoknes before the the first try catch will fail the test
    it("test that modules have been initiated when we call supertokens.init", async function () {
        const connectionURI = await startST();

        try {
            SessionRecipe.getInstanceOrThrowError();
            assert(false);
        } catch (err) {
            if (
                err.message !==
                "Initialisation not done. Did you forget to call the SuperTokens.init or Session.init function?"
            ) {
                throw err;
            }
        }

        try {
            EmailPasswordRecipe.getInstanceOrThrowError();
            assert(false);
        } catch (err) {
            if (err.message !== "Initialisation not done. Did you forget to call the Emailpassword.init function?") {
                throw err;
            }
        }

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailPassword.init(),
            ],
        });
        SessionRecipe.getInstanceOrThrowError();
        EmailPasswordRecipe.getInstanceOrThrowError();
    });

    /* 
        Test various inputs to routing (if it accepts or not)
        - including when the base path is "/"
        - with and without a rId
        - where we do not have to handle it and it skips it (with / without rId)
    */

    //Failure condition: Tests will fail is using the incorrect base path
    it("test various inputs to routing with default base path", async function () {
        const connectionURI = await startST();
        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe.init()],
        });
        const app = express();

        app.use(middleware());

        app.post("/auth/user-api", async (req, res) => {
            res.status(200).json({ message: "success" });
        });

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "success TestRecipe /");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/")
                .set("rid", "testRecipe")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "success TestRecipe /");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/user-api")
                .set("rid", "testRecipe")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "success");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/user-api")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "success");
    });

    //Failure condition: Tests will fail is using the wrong base path
    it("test various inputs to routing when base path is /", async function () {
        const connectionURI = await startST();
        {
            ST.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/",
                },
                recipeList: [TestRecipe.init()],
            });
            const app = express();
            app.use(middleware());

            app.post("/user-api", async (req, res) => {
                res.status(200).json({ message: "success" });
            });

            app.use(errorHandler());

            let r1 = await new Promise((resolve) =>
                request(app)
                    .post("/")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res.body);
                        }
                    })
            );
            assert(r1.message === "success TestRecipe /");

            r1 = await new Promise((resolve) =>
                request(app)
                    .post("/")
                    .set("rid", "testRecipe")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res.body);
                        }
                    })
            );
            assert(r1.message === "success TestRecipe /");

            r1 = await new Promise((resolve) =>
                request(app)
                    .post("/user-api")
                    .set("rid", "testRecipe")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res.body);
                        }
                    })
            );
            assert(r1.message === "success");

            r1 = await new Promise((resolve) =>
                request(app)
                    .post("/user-api")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res.body);
                        }
                    })
            );
            assert(r1.message === "success");

            resetAll();
        }
    });

    //Failure condition: Tests will fail if the incorrect rid header value is set when sending a request the path
    it("test routing with multiple recipes", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe.init(), TestRecipe1.init()],
        });

        const app = express();

        app.use(middleware());

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/hello")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(r1.body.message === "success TestRecipe /hello" || r1.body.message === "success TestRecipe1 /hello");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/hello")
                .set("rid", "testRecipe1")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(r1.body.message === "success TestRecipe1 /hello");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/hello")
                .set("rid", "testRecipe")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(r1.body.message === "success TestRecipe /hello");
    });

    // Test various inputs to errorHandler (if it accepts or not)
    it("test various inputs to errorHandler", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe.init(), TestRecipe1.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());
        app.use((err, request, response, next) => {
            if (err.message == "General error from TestRecipe") {
                response.status(200).send("General error handled in user error handler");
            } else {
                response.status(500).send("Invalid error");
            }
        });

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/error/general")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.text);
                    }
                })
        );
        assert(r1 === "General error handled in user error handler");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/error/badinput")
                .expect(400)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(r1.status === 400);
        assert(r1.body.message === "Bad input error from TestRecipe");
    });

    // Error thrown from APIs implemented by recipes must not go unhandled
    it("test that error thrown from APIs implemented by recipes must not go unhandled", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());
        app.use((err, req, res, next) => {
            if (err.message === "error thrown in api") {
                res.status(200).json({ message: "success" });
            } else {
                res.status(200).json({ message: "failure" });
            }
        });

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/error")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "error from TestRecipe /error ");

        r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/error/api-error")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                })
        );
        assert(r1.message === "success");
    });

    // Disable a default route, and then implement your own API and check that that gets called
    // Failure condition: in testRecipe1 if the disabled value for the /default-route-disabled is set to false, the test will fail
    it("test if you diable a default route, and then implement your own API, your own api is called", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe1.init()],
        });

        const app = express();

        app.use(middleware());

        app.post("/auth/default-route-disabled", async (req, res) => {
            res.status(200).json({ message: "user defined api" });
        });

        app.use(errorHandler());

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/default-route-disabled")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body.message);
                    }
                })
        );
        assert(r1 === "user defined api");
    });

    // If an error handler in a recipe throws an error, that error next to go to the user's error handler
    it("test if the error handler in a recipe throws an error, it goes to the user's error handler", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe.init()],
        });

        const app = express();

        app.use(middleware());
        app.use(errorHandler());
        app.use((err, request, response, next) => {
            if (err.message === "error from inside recipe error handler") {
                response.status(200).send("user error handler");
            } else {
                response.status(500).send("invalid error");
            }
        });

        let r1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/error/throw-error")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.text);
                    }
                })
        );
        assert(r1 === "user error handler");
    });

    // Test getAllCORSHeaders
    it("test the getAllCORSHeaders function", async function () {
        const connectionURI = await startST();

        ST.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [TestRecipe1.init(), TestRecipe2.init(), TestRecipe3.init(), TestRecipe3Duplicate.init()],
        });
        let headers = await ST.getAllCORSHeaders();
        assert.strictEqual(headers.length, 5);
        assert(headers.includes("rid"));
        assert(headers.includes("fdi-version"));
        assert(headers.includes("test-recipe-1"));
        assert(headers.includes("test-recipe-2"));
        assert(headers.includes("test-recipe-3"));
    });
});

class TestRecipe extends RecipeModule {
    constructor(recipeId, appInfo) {
        super(recipeId, appInfo);
    }

    static init() {
        return (appInfo) => {
            if (TestRecipe.instance === undefined) {
                TestRecipe.instance = new TestRecipe("testRecipe", appInfo);
                return TestRecipe.instance;
            } else {
                throw new Error("already initialised");
            }
        };
    }

    isErrorFromThisRecipe(err) {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === "testRecipe";
    }

    getAPIsHandled() {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/"),
                id: "/",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/hello"),
                id: "/hello",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error"),
                id: "/error",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error/api-error"),
                id: "/error/api-error",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error/general"),
                id: "/error/general",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error/badinput"),
                id: "/error/badinput",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error/throw-error"),
                id: "/error/throw-error",
                disabled: false,
            },
        ];
    }

    async handleAPIRequest(id, tenantId, req, res, next) {
        if (id === "/") {
            res.setStatusCode(200);
            res.sendJSONResponse({ message: "success TestRecipe /" });
            return true;
        } else if (id === "/hello") {
            res.setStatusCode(200);
            res.sendJSONResponse({ message: "success TestRecipe /hello" });
            return true;
        } else if (id === "/error") {
            throw new TestRecipeError({
                message: "error from TestRecipe /error ",
                payload: undefined,
                type: "ERROR_FROM_TEST_RECIPE",
            });
        } else if (id === "/error/general") {
            throw new Error("General error from TestRecipe");
        } else if (id === "/error/badinput") {
            throw new TestRecipeError({
                message: "Bad input error from TestRecipe",
                payload: undefined,
                type: STError.BAD_INPUT_ERROR,
            });
        } else if (id === "/error/throw-error") {
            throw new TestRecipeError({
                message: "Error thrown from recipe error",
                payload: undefined,
                type: "ERROR_FROM_TEST_RECIPE_ERROR_HANDLER",
            });
        } else if (id === "/error/api-error") {
            throw new Error("error thrown in api");
        }
    }

    handleError(err, request, response) {
        if (err.type === "ERROR_FROM_TEST_RECIPE") {
            response.setStatusCode(200);
            response.sendJSONResponse({ message: err.message });
        } else if (err.type === "ERROR_FROM_TEST_RECIPE_ERROR_HANDLER") {
            throw new Error("error from inside recipe error handler");
        } else {
            throw err;
        }
    }

    getAllCORSHeaders() {
        return [];
    }

    static reset() {
        this.instance = undefined;
    }
}

class TestRecipeError extends STError {
    constructor(err) {
        super(err);
        this.fromRecipe = "testRecipe";
    }
}

class TestRecipe1 extends RecipeModule {
    constructor(recipeId, appInfo) {
        super(recipeId, appInfo);
    }

    static init() {
        return (appInfo) => {
            if (TestRecipe1.instance === undefined) {
                TestRecipe1.instance = new TestRecipe1("testRecipe1", appInfo);
                return TestRecipe1.instance;
            } else {
                throw new Error("already initialised");
            }
        };
    }

    isErrorFromThisRecipe(err) {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === "testRecipe1";
    }

    getAPIsHandled() {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/"),
                id: "/",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/hello"),
                id: "/hello",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/hello1"),
                id: "/hello1",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/error"),
                id: "/error",
                disabled: false,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/default-route-disabled"),
                id: "/default-route-disabled",
                disabled: true,
            },
        ];
    }

    async handleAPIRequest(id, tenantId, req, res) {
        if (id === "/") {
            res.setStatusCode(200);
            res.sendJSONResponse({ message: "success TestRecipe1 /" });
            return true;
        } else if (id === "/hello") {
            res.setStatusCode(200);
            res.sendJSONResponse({ message: "success TestRecipe1 /hello" });
            return true;
        } else if (id === "/hello1") {
            res.setStatusCode(200);
            res.sendJSONResponse({ message: "success TestRecipe1 /hello1" });
            return true;
        } else if (id === "/error") {
            throw new TestRecipe1Error({
                message: "error from TestRecipe1 /error ",
                payload: undefined,
                type: "ERROR_FROM_TEST_RECIPE1",
            });
        } else if (id === "/default-route-disabled") {
            res.status(200);
            res.sendJSONResponse({ message: "default route used" });
            return true;
        }
    }

    handleError(err, request, response) {
        if (err.type === "ERROR_FROM_TEST_RECIPE1") {
            response.setStatusCode(200);
            res.sendJSONResponse({ message: err.message });
        } else {
            throw err;
        }
    }

    getAllCORSHeaders() {
        return ["test-recipe-1"];
    }

    static reset() {
        this.instance = undefined;
    }
}

class TestRecipe1Error extends STError {
    constructor(err) {
        super(err);
        this.fromRecipe = "testRecipe1";
    }
}

class TestRecipe2 extends RecipeModule {
    constructor(recipeId, appInfo) {
        super(recipeId, appInfo);
    }

    static init() {
        return (appInfo) => {
            if (TestRecipe2.instance === undefined) {
                TestRecipe2.instance = new TestRecipe2("testRecipe2", appInfo);
                return TestRecipe2.instance;
            } else {
                throw new Error("already initialised");
            }
        };
    }

    getAPIsHandled() {
        return [];
    }

    getAllCORSHeaders() {
        return ["test-recipe-2"];
    }

    static reset() {
        this.instance = undefined;
    }
}

class TestRecipe3 extends RecipeModule {
    constructor(recipeId, appInfo) {
        super(recipeId, appInfo);
    }

    static init() {
        return (appInfo) => {
            if (TestRecipe3.instance === undefined) {
                TestRecipe3.instance = new TestRecipe3("testRecipe3", appInfo);
                return TestRecipe3.instance;
            } else {
                throw new Error("already initialised");
            }
        };
    }

    getAPIsHandled() {
        return [];
    }

    getAllCORSHeaders() {
        return ["test-recipe-3"];
    }

    static reset() {
        this.instance = undefined;
    }
}

class TestRecipe3Duplicate extends RecipeModule {
    constructor(recipeId, appInfo) {
        super(recipeId, appInfo);
    }

    static init() {
        return (appInfo) => {
            if (TestRecipe3Duplicate.instance === undefined) {
                TestRecipe3Duplicate.instance = new TestRecipe3("testRecipe3Duplicate", appInfo);
                return TestRecipe3Duplicate.instance;
            } else {
                throw new Error("already initialised");
            }
        };
    }

    getAPIsHandled() {
        return [];
    }

    getAllCORSHeaders() {
        return ["test-recipe-3"];
    }

    static reset() {
        this.instance = undefined;
    }
}

function resetTestRecipies() {
    TestRecipe.reset();
    TestRecipe1.reset();
    TestRecipe2.reset();
    TestRecipe3.reset();
    TestRecipe3Duplicate.reset();
}
