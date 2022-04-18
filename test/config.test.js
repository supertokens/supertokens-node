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
    extractInfoFromResponse,
} = require("./utils");
const request = require("supertest");
const express = require("express");
let STExpress = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let NormalisedURLPath = require("../lib/build/normalisedURLPath").default;
let NormalisedURLDomain = require("../lib/build/normalisedURLDomain").default;
let { normaliseSessionScopeOrThrowError } = require("../lib/build/recipe/session/utils");
const { Querier } = require("../lib/build/querier");
let SuperTokens = require("../lib/build/supertokens").default;
let ST = require("../");
let EmailPassword = require("../lib/build/recipe/emailpassword");
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
const { getTopLevelDomainForSameSiteResolution } = require("../lib/build/recipe/session/utils");
let { middleware, errorHandler } = require("../framework/express");

/**
 * TODO: (Later) test config for faunadb session module
 */

describe(`configTest: ${printPath("[test/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // test various inputs for appInfo
    // Failure condition: passing data of invalid type/ syntax to appInfo
    it("test values for optional inputs for appInfo", async function () {
        await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });
            assert(SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/auth");
            assert(SuperTokens.getInstanceOrThrowError().appInfo.websiteBasePath.getAsStringDangerous() === "/auth");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/test");
            assert(SuperTokens.getInstanceOrThrowError().appInfo.websiteBasePath.getAsStringDangerous() === "/test1");

            resetAll();
        }
    });

    it("test values for compulsory inputs for appInfo", async function () {
        await startST();

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init()],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Please provide your apiDomain inside the appInfo object when calling supertokens.init"
                ) {
                    throw err;
                }
            }

            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init()],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Please provide your appName inside the appInfo object when calling supertokens.init"
                ) {
                    throw err;
                }
            }

            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                    },
                    recipeList: [Session.init()],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
                ) {
                    throw err;
                }
            }

            resetAll();
        }
    });

    // test using zero, one and two recipe modules
    // Failure condition: initial supertokens with the incorrect number of modules as specified in the checks
    it("test using zero, one and two recipe modules", async function () {
        await startST();

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [],
                });
                assert(false);
            } catch (err) {
                if (err.message !== "Please provide at least one recipe to the supertokens.init function call") {
                    throw err;
                }
            }

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });
            SessionRecipe.getInstanceOrThrowError();
            assert(SuperTokens.getInstanceOrThrowError().recipeModules.length === 1);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), EmailPassword.init()],
            });
            SessionRecipe.getInstanceOrThrowError();
            EmailPasswordRecipe.getInstanceOrThrowError();
            assert(SuperTokens.getInstanceOrThrowError().recipeModules.length === 2);
            resetAll();
        }
    });

    // test config for session module
    // Failure condition: passing data of invalid type/ syntax to the modules config
    it("test config for session module", async function () {
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
                    cookieDomain: "testDomain",
                    sessionExpiredStatusCode: 111,
                    cookieSecure: true,
                }),
            ],
        });
        assert(SessionRecipe.getInstanceOrThrowError().config.cookieDomain === "testdomain");
        assert(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode === 111);
        assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
    });

    it("various sameSite values", async function () {
        await startST();

        {
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
                        cookieSameSite: " Lax ",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");

            resetAll();
        }

        {
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
                        cookieSameSite: "None ",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "none");

            resetAll();
        }

        {
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
                        cookieSameSite: " STRICT ",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "strict");

            resetAll();
        }

        {
            try {
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
                            cookieSameSite: "random ",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== 'cookie same site must be one of "strict", "lax", or "none"') {
                    throw error;
                }
            }

            resetAll();
        }

        {
            try {
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
                            cookieSameSite: " ",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== 'cookie same site must be one of "strict", "lax", or "none"') {
                    throw error;
                }
            }

            resetAll();
        }

        {
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
                        cookieSameSite: "lax",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");

            resetAll();
        }

        {
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
                        cookieSameSite: "none",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "none");

            resetAll();
        }

        {
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
                        cookieSameSite: "strict",
                    }),
                ],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "strict");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");

            resetAll();
        }
    });

    it("testing sessionScope normalisation", async function () {
        assert(normaliseSessionScopeOrThrowError("api.example.com") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("https://api.example.com") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com?hello=1") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com/hello") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com/") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com:8080") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com#random2") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com/") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com#random") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("example.com") === "example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com/?hello=1&bye=2") === "api.example.com");
        assert(normaliseSessionScopeOrThrowError("localhost.org") === "localhost.org");
        assert(normaliseSessionScopeOrThrowError("localhost") === "localhost");
        assert(normaliseSessionScopeOrThrowError("localhost:8080") === "localhost");
        assert(normaliseSessionScopeOrThrowError("localhost.org") === "localhost.org");
        assert(normaliseSessionScopeOrThrowError("127.0.0.1") === "127.0.0.1");

        assert(normaliseSessionScopeOrThrowError(".api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError(".api.example.com/") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError(".api.example.com#random") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError(".example.com") === ".example.com");
        assert(normaliseSessionScopeOrThrowError(".api.example.com/?hello=1&bye=2") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError(".localhost.org") === ".localhost.org");
        assert(normaliseSessionScopeOrThrowError(".localhost") === "localhost");
        assert(normaliseSessionScopeOrThrowError(".localhost:8080") === "localhost");
        assert(normaliseSessionScopeOrThrowError(".localhost.org") === ".localhost.org");
        assert(normaliseSessionScopeOrThrowError(".127.0.0.1") === "127.0.0.1");

        try {
            normaliseSessionScopeOrThrowError("http://");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid sessionScope");
        }
    });

    it("testing URL path normalisation", async function () {
        function normaliseURLPathOrThrowError(input) {
            return new NormalisedURLPath(input).getAsStringDangerous();
        }

        assert.strictEqual(normaliseURLPathOrThrowError("exists?email=john.doe%40gmail.com"), "/exists");
        assert.strictEqual(
            normaliseURLPathOrThrowError("/auth/email/exists?email=john.doe%40gmail.com"),
            "/auth/email/exists"
        );
        assert.strictEqual(normaliseURLPathOrThrowError("exists"), "/exists");
        assert.strictEqual(normaliseURLPathOrThrowError("/exists"), "/exists");
        assert.strictEqual(normaliseURLPathOrThrowError("/exists?email=john.doe%40gmail.com"), "/exists");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("https://api.example.com"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com?hello=1"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/hello"), "/hello");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com:8080"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com#random2"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com/"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com#random"), "");
        assert.strictEqual(normaliseURLPathOrThrowError(".example.com"), "");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com/?hello=1&bye=2"), "");

        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("http://1.2.3.4/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("1.2.3.4/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("https://api.example.com/one/two/"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/one/two?hello=1"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/hello/"), "/hello");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/one/two/"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com:8080/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("http://api.example.com/one/two#random2"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com/one/two/#random"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError(".example.com/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("api.example.com/one/two?hello=1&bye=2"), "/one/two");

        assert.strictEqual(normaliseURLPathOrThrowError("/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("one/two/"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("/one"), "/one");
        assert.strictEqual(normaliseURLPathOrThrowError("one"), "/one");
        assert.strictEqual(normaliseURLPathOrThrowError("one/"), "/one");
        assert.strictEqual(normaliseURLPathOrThrowError("/one/two/"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("/one/two?hello=1"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("one/two?hello=1"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("/one/two/#random"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("one/two#random"), "/one/two");

        assert.strictEqual(normaliseURLPathOrThrowError("localhost:4000/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("127.0.0.1:4000/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("127.0.0.1/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("https://127.0.0.1:80/one/two"), "/one/two");
        assert.strictEqual(normaliseURLPathOrThrowError("/"), "");
        assert.strictEqual(normaliseURLPathOrThrowError(""), "");

        assert.strictEqual(normaliseURLPathOrThrowError("/.netlify/functions/api"), "/.netlify/functions/api");
        assert.strictEqual(normaliseURLPathOrThrowError("/netlify/.functions/api"), "/netlify/.functions/api");
        assert.strictEqual(
            normaliseURLPathOrThrowError("app.example.com/.netlify/functions/api"),
            "/.netlify/functions/api"
        );
        assert.strictEqual(
            normaliseURLPathOrThrowError("app.example.com/netlify/.functions/api"),
            "/netlify/.functions/api"
        );
        assert.strictEqual(normaliseURLPathOrThrowError("/app.example.com"), "/app.example.com");
    });

    it("testing URL domain normalisation", async function () {
        function normaliseURLDomainOrThrowError(input) {
            return new NormalisedURLDomain(input).getAsStringDangerous();
        }
        assert(normaliseURLDomainOrThrowError("http://api.example.com") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("https://api.example.com") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com?hello=1") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com/hello") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com/") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com:8080") === "http://api.example.com:8080");
        assert(normaliseURLDomainOrThrowError("http://api.example.com#random2") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com/") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com#random") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError(".example.com") === "https://example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com/?hello=1&bye=2") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("localhost") === "http://localhost");
        assert(normaliseURLDomainOrThrowError("https://localhost") === "https://localhost");

        assert(normaliseURLDomainOrThrowError("http://api.example.com/one/two") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://1.2.3.4/one/two") === "http://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("https://1.2.3.4/one/two") === "https://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("1.2.3.4/one/two") === "http://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("https://api.example.com/one/two/") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com/one/two?hello=1") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("http://api.example.com/one/two#random2") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com/one/two") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("api.example.com/one/two/#random") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError(".example.com/one/two") === "https://example.com");
        assert(normaliseURLDomainOrThrowError("localhost:4000") === "http://localhost:4000");
        assert(normaliseURLDomainOrThrowError("127.0.0.1:4000") === "http://127.0.0.1:4000");
        assert(normaliseURLDomainOrThrowError("127.0.0.1") === "http://127.0.0.1");
        assert(normaliseURLDomainOrThrowError("https://127.0.0.1:80/") === "https://127.0.0.1:80");

        try {
            normaliseURLDomainOrThrowError("/one/two");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid domain name");
        }

        try {
            normaliseURLDomainOrThrowError("/.netlify/functions/api");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid domain name");
        }
    });

    it("various config values", async function () {
        await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/custom/a",
                },
                recipeList: [Session.init()],
            });
            assert(
                SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous() ===
                    "/custom/a/session/refresh"
            );
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/",
                },
                recipeList: [Session.init()],
            });
            assert(
                SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous() ===
                    "/session/refresh"
            );
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });
            assert(
                SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous() ===
                    "/auth/session/refresh"
            );
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                    apiKey: "haha",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });
            assert(Querier.apiKey === "haha");
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/custom",
                },
                recipeList: [
                    Session.init({
                        sessionExpiredStatusCode: 402,
                    }),
                ],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode === 402);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080;try.supertokens.io;try.supertokens.io:8080;localhost:90",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });
            let hosts = Querier.hosts;
            assert(hosts.length === 4);

            assert(hosts[0].domain.getAsStringDangerous() === "http://localhost:8080");
            assert(hosts[1].domain.getAsStringDangerous() === "https://try.supertokens.io");
            assert(hosts[2].domain.getAsStringDangerous() === "https://try.supertokens.io:8080");
            assert(hosts[3].domain.getAsStringDangerous() === "http://localhost:90");
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_CUSTOM_HEADER",
                    }),
                ],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "https://api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "https://api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.com",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "none");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.co.uk",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.co.uk",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_CUSTOM_HEADER",
                    }),
                ],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "none");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init()],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "google.com",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "NONE",
                    }),
                ],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrf === "NONE");
            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "127.0.0.1:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [
                        Session.init({
                            antiCsrf: "RANDOM",
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (err.message !== "antiCsrf config must be one of 'NONE' or 'VIA_CUSTOM_HEADER' or 'VIA_TOKEN'") {
                    throw err;
                }
            }
            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "http://api.test.com:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [Session.init()],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                ) {
                    throw err;
                }
            }
            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        apiDomain: "https://api.test.com:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [
                        Session.init({
                            cookieSecure: false,
                        }),
                    ],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                ) {
                    throw err;
                }
            }
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "https://localhost",
                    appName: "Supertokens",
                    websiteDomain: "http://localhost:3000",
                },
                recipeList: [Session.init()],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure);
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite === "none");

            resetAll();
        }
    });

    it("checking for default cookie config", async function () {
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
            recipeList: [Session.init()],
        });
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieDomain, undefined);
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieSameSite, "lax");
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieSecure, true);
        assert.equal(
            SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous(),
            "/auth/session/refresh"
        );
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode, 401);
    });

    it("Test that the jwt feature is disabled by default", async function () {
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
            recipeList: [Session.init()],
        });
        assert.notStrictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt, undefined);
        assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt.enable, false);
    });

    it("Test that the jwt feature is disabled when explicitly set to false", async function () {
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
            recipeList: [Session.init({ jwt: { enable: false } })],
        });
        assert.notStrictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt, undefined);
        assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt.enable, false);
    });

    it("Test that the jwt feature is enabled when explicitly set to true", async function () {
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
            recipeList: [Session.init({ jwt: { enable: true } })],
        });

        assert.notStrictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt, undefined);
        assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt.enable, true);
    });

    it("Test that the custom jwt property name in access token payload is set correctly in config", async function () {
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
            recipeList: [Session.init({ jwt: { enable: true, propertyNameInAccessTokenPayload: "customJWTKey" } })],
        });

        assert.notStrictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt, undefined);
        assert.strictEqual(
            SessionRecipe.getInstanceOrThrowError().config.jwt.propertyNameInAccessTokenPayload,
            "customJWTKey"
        );
    });

    it("Test that the the jwt property name uses default value when not set in config", async function () {
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
            recipeList: [Session.init({ jwt: { enable: true } })],
        });

        assert.notStrictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt, undefined);
        assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.jwt.propertyNameInAccessTokenPayload, "jwt");
    });

    it("Test that when setting jwt property name with the same value as the reserved property, init throws an error", async function () {
        try {
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
                recipeList: [Session.init({ jwt: { enable: true, propertyNameInAccessTokenPayload: "_jwtPName" } })],
            });

            throw new Error("Init succeeded when it should have failed");
        } catch (e) {
            if (e.message !== "_jwtPName is a reserved property name, please use a different key name for the jwt") {
                throw e;
            }
        }
    });

    it("testing getTopLevelDomainForSameSiteResolution function", async function () {
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://a.b.test.com"), "test.com");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("https://a.b.test.com"), "test.com");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://a.b.test.co.uk"), "test.co.uk");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://a.b.test.co.uk"), "test.co.uk");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://test.com"), "test.com");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("https://test.com"), "test.com");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://localhost"), "localhost");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://localhost.org"), "localhost");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://8.8.8.8"), "localhost");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://8.8.8.8:8080"), "localhost");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://localhost:3000"), "localhost");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("http://test.com:3567"), "test.com");
        assert.strictEqual(getTopLevelDomainForSameSiteResolution("https://test.com:3567"), "test.com");
    });

    it("apiGatewayPath test", async function () {
        await startST();
        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiGatewayPath: "/gateway",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                res.status(200).send("");
            });

            let res = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(res2.status === 200);

            assert(
                SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/gateway/auth"
            );
            resetAll();
        }
        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "hello",
                    apiGatewayPath: "/gateway",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                res.status(200).send("");
            });

            let res = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/hello/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(res2.status === 200);

            assert(
                SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/gateway/hello"
            );
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "hello",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                res.status(200).send("");
            });

            let res = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            let res2 = await new Promise((resolve) =>
                request(app)
                    .post("/hello/session/refresh")
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(res2.status === 200);

            assert(SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/hello");
            resetAll();
        }
    });

    it("checking for empty item in recipeList config", async function () {
        await startST();
        let errorCaught = true;
        try {
            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), , EmailPassword.init()],
            });
            errorCaught = false;
        } catch (err) {
            assert.strictEqual(err.message, "Please remove empty items from recipeList");
        }
        assert(errorCaught);
    });
});
