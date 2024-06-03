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
    extractInfoFromResponse,
    setKeyValueInConfig,
} = require("./utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("..");
let Session = require("../recipe/session");
let EmailPassword = require("../recipe/emailpassword");
let { Querier } = require("../lib/build/querier");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
const { verifySession } = require("../recipe/session/framework/express");
const { default: next } = require("next");
let { middleware, errorHandler } = require("../framework/express");
let STExpress = require("../");
let fs = require("fs");
let path = require("path");
const { fail } = require("assert");

describe(`userContext: ${printPath("[test/userContext.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("testing context across interface and recipe function", async function () {
        const connectionURI = await startST();
        let works = false;
        let signUpContextWorks = false;
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
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                signUp: async function (input) {
                                    if (input.userContext.manualCall) {
                                        signUpContextWorks = true;
                                    }
                                    return oI.signUp(input);
                                },
                                signIn: async function (input) {
                                    if (input.userContext.preSignInPOST) {
                                        input.userContext.preSignIn = true;
                                    }

                                    let resp = await oI.signIn(input);

                                    if (input.userContext.preSignInPOST && input.userContext.preSignIn) {
                                        input.userContext.postSignIn = true;
                                    }
                                    return resp;
                                },
                            };
                        },
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInPOST: async function (input) {
                                    input.userContext = {
                                        preSignInPOST: true,
                                    };

                                    let resp = await oI.signInPOST(input);

                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.preCreateNewSession &&
                                        input.userContext.postCreateNewSession &&
                                        input.userContext.postSignIn
                                    ) {
                                        works = true;
                                    }
                                    return resp;
                                },
                            };
                        },
                    },
                }),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async function (input) {
                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.postSignIn
                                    ) {
                                        input.userContext.preCreateNewSession = true;
                                    }

                                    let resp = oI.createNewSession(input);

                                    if (
                                        input.userContext.preSignInPOST &&
                                        input.userContext.preSignIn &&
                                        input.userContext.preCreateNewSession &&
                                        input.userContext.postSignIn
                                    ) {
                                        input.userContext.postCreateNewSession = true;
                                    }

                                    return resp;
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

        await EmailPassword.signUp("public", "random@gmail.com", "validpass123", undefined, {
            manualCall: true,
        });

        let response = await new Promise((resolve) =>
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
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 200);
        assert(works);
        assert(signUpContextWorks);
    });

    it("testing default context across interface and recipe function", async function () {
        const connectionURI = await startST();
        let signInContextWorks = false;
        let signInAPIContextWorks = false;
        let createNewSessionContextWorks = false;

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
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                signIn: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        signInContextWorks = true;
                                    }

                                    return await oI.signIn(input);
                                },
                            };
                        },
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInPOST: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        signInAPIContextWorks = true;
                                    }

                                    return await oI.signInPOST(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async function (input) {
                                    if (input.userContext._default && input.userContext._default.request) {
                                        createNewSessionContextWorks = true;
                                    }

                                    return await oI.createNewSession(input);
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

        await EmailPassword.signUp("public", "random@gmail.com", "validpass123", undefined, {
            manualCall: true,
        });

        let response = await new Promise((resolve) =>
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
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 200);
        assert(signInContextWorks);
        assert(signInAPIContextWorks);
        assert(createNewSessionContextWorks);
    });

    it("Test that SuperTokens.getRequestFromUserContext works as expected", async function () {
        const connectionURI = await startST();
        let signInContextWorks = false;
        let signInAPIContextWorks = false;
        let createNewSessionContextWorks = false;

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
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                signIn: async function (input) {
                                    const requestFromContext = SuperTokens.getRequestFromUserContext(input.userContext);
                                    if (requestFromContext !== undefined) {
                                        assert(requestFromContext.getMethod() === "post");
                                        assert(requestFromContext.getOriginalURL() === "/auth/signin");
                                        const body = await requestFromContext.getJSONBody();
                                        assert(body !== undefined);
                                        assert.deepEqual(body.customData, {
                                            customObject: {
                                                customKey: "customValue",
                                            },
                                        });
                                        signInContextWorks = true;
                                    }

                                    return await oI.signIn(input);
                                },
                            };
                        },
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInPOST: async function (input) {
                                    const requestFromContext = SuperTokens.getRequestFromUserContext(input.userContext);
                                    if (requestFromContext !== undefined) {
                                        assert(requestFromContext.getMethod() === "post");
                                        assert(requestFromContext.getOriginalURL() === "/auth/signin");
                                        const body = await requestFromContext.getJSONBody();
                                        assert(body !== undefined);
                                        assert.deepEqual(body.customData, {
                                            customObject: {
                                                customKey: "customValue",
                                            },
                                        });
                                        signInAPIContextWorks = true;
                                    }

                                    return await oI.signInPOST(input);
                                },
                            };
                        },
                    },
                }),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async function (input) {
                                    const requestFromContext = SuperTokens.getRequestFromUserContext(input.userContext);
                                    if (requestFromContext !== undefined) {
                                        assert(requestFromContext.getMethod() === "post");
                                        assert(requestFromContext.getOriginalURL() === "/auth/signin");
                                        const body = await requestFromContext.getJSONBody();
                                        assert(body !== undefined);
                                        assert.deepEqual(body.customData, {
                                            customObject: {
                                                customKey: "customValue",
                                            },
                                        });
                                        createNewSessionContextWorks = true;
                                    }

                                    return await oI.createNewSession(input);
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

        await EmailPassword.signUp("public", "random@gmail.com", "validpass123", undefined, {
            manualCall: true,
        });

        let response = await new Promise((resolve) =>
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
                    customData: {
                        customObject: {
                            customKey: "customValue",
                        },
                    },
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 200);
        assert(signInContextWorks);
        assert(signInAPIContextWorks);
        assert(createNewSessionContextWorks);
    });

    it("test that makeDefaultUserContext is not used anywhere apart from frameworks and a few other places", async function () {
        function recursive(dir, done) {
            let results = [];
            fs.readdir(dir, function (err, list) {
                if (err) return done(err);
                let pending = list.length;
                if (!pending) return done(null, results);
                list.forEach(function (file) {
                    file = path.resolve(dir, file);
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            recursive(file, function (err, res) {
                                results = results.concat(res);
                                if (!--pending) done(null, results);
                            });
                        } else {
                            results.push(file);
                            if (!--pending) done(null, results);
                        }
                    });
                });
            });
        }

        let files = await new Promise((resolve, reject) => {
            recursive("./lib/ts", (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(files);
            });
        });

        let totalCount = 0;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let content = fs.readFileSync(file).toString();
            let count = content.split("makeDefaultUserContextFromAPI(").length - 1;
            totalCount += count;
        }

        assert(totalCount === 31);
    });

    it("test user context type usage everywhere", async function () {
        function recursive(dir, done) {
            let results = [];
            fs.readdir(dir, function (err, list) {
                if (err) return done(err);
                let pending = list.length;
                if (!pending) return done(null, results);
                list.forEach(function (file) {
                    file = path.resolve(dir, file);
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            recursive(file, function (err, res) {
                                results = results.concat(res);
                                if (!--pending) done(null, results);
                            });
                        } else {
                            results.push(file);
                            if (!--pending) done(null, results);
                        }
                    });
                });
            });
        }

        let files = await new Promise((resolve, reject) => {
            recursive("./lib/ts", (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(files);
            });
        });

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            let parts = file.split("/");
            if (parts.length < 3) {
                continue;
            }

            let content = fs.readFileSync(file).toString();

            let fileExceptions = [
                {
                    fileName: "lib/ts/index.ts",
                    shouldNotContain: ["userContext?: UserContext", "userContext: Record<String, any>"],
                    canContain: [],
                },
                {
                    fileName: "lib/ts/utils.ts",
                    shouldNotContain: [],
                    canContain: [],
                },
                {
                    fileName: "lib/ts/recipe/session/index.ts",
                    shouldNotContain: ["userContext?: UserContext", "userContext: Record<String, any>"],
                    canContain: [{ text: "userContext: UserContext", count: 1 }],
                },
                {
                    fileName: "lib/ts/recipe/session/sessionClass.ts",
                    shouldNotContain: [
                        "userContext: UserContext",
                        "userContext?: UserContext",
                        "userContext: Record<String, any>",
                    ],
                    canContain: [],
                },
                {
                    fileName: "lib/ts/recipe/session/types.ts",
                    shouldNotContain: ["userContext: Record<String, any>", "userContext?: UserContext"],
                    canContain: [{ text: "userContext?: Record<String, any>", count: 18 }],
                },
                {
                    fileName: "lib/ts/nextjs.ts",
                    shouldNotContain: ["userContext: Record<String, any>", "userContext?: UserContext"],
                    canContain: [{ text: "userContext?: Record<String, any>", count: 2 }],
                },
            ];

            let fileExceptionFound = false;
            for (let fileException of fileExceptions) {
                if (file.endsWith(fileException.fileName)) {
                    fileExceptionFound = fileException;
                }
            }

            if (!fileExceptionFound) {
                if (parts[parts.length - 1] === "index.ts" && parts[parts.length - 3] === "recipe") {
                    fileExceptionFound = {
                        shouldNotContain: [
                            "userContext: UserContext",
                            "userContext?: UserContext",
                            "userContext: Record<String, any>",
                        ],
                        canContain: [],
                    };
                } else {
                    fileExceptionFound = {
                        shouldNotContain: [
                            "userContext: Record<String, any>",
                            "userContext?: Record<String, any>",
                            "userContext?: UserContext",
                        ],
                        canContain: [],
                    };
                }
            }

            for (let shouldNotContain of fileExceptionFound.shouldNotContain) {
                if (content.toLowerCase().includes(shouldNotContain.toLowerCase())) {
                    fail(`${file} cannot contain ${shouldNotContain}`);
                }
            }

            for (let canContain of fileExceptionFound.canContain) {
                if (content.toLowerCase().split(canContain.text.toLowerCase()).length - 1 !== canContain.count) {
                    fail(`${file} should contain ${canContain.text} only ${canContain.count} times`);
                }
            }
        }
    });
});
