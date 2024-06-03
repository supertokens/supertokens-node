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
    mockResponse,
    mockRequest,
} = require("./utils");
const request = require("supertest");
const express = require("express");
const debug = require("debug");
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
const { getTopLevelDomainForSameSiteResolution } = require("../lib/build/utils");
const { middleware } = require("../framework/express");
const { logDebugMessage } = require("../lib/build/logger");

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
        const connectionURI = await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            assert(SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/auth");
            assert(SuperTokens.getInstanceOrThrowError().appInfo.websiteBasePath.getAsStringDangerous() === "/auth");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SuperTokens.getInstanceOrThrowError().appInfo.apiBasePath.getAsStringDangerous() === "/test");
            assert(SuperTokens.getInstanceOrThrowError().appInfo.websiteBasePath.getAsStringDangerous() === "/test1");

            resetAll();
        }
    });

    it("testing .local tld", async function () {
        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:3567",
            },
            appInfo: {
                apiDomain: "api.local/hi",
                appName: "SuperTokens",
                websiteDomain: "website.local/lol",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
    });

    it("test values for compulsory inputs for appInfo", async function () {
        const connectionURI = await startST();

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
                });
                assert(false);
            } catch (err) {
                if (
                    err.message !==
                    "Please provide either origin or websiteDomain inside the appInfo object when calling supertokens.init"
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
        const connectionURI = await startST();

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI,
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            SessionRecipe.getInstanceOrThrowError();
            assert.strictEqual(SuperTokens.getInstanceOrThrowError().recipeModules.length, 3); // multitenancy&usermetadata is initialised by default
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), EmailPassword.init()],
            });
            SessionRecipe.getInstanceOrThrowError();
            EmailPasswordRecipe.getInstanceOrThrowError();
            assert(SuperTokens.getInstanceOrThrowError().recipeModules.length === 4); // multitenancy&usermetadata is initialised by default
            resetAll();
        }
    });

    // test config for session module
    // Failure condition: passing data of invalid type/ syntax to the modules config
    it("test config for session module", async function () {
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
                Session.init({
                    getTokenTransferMethod: () => "cookie",
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
        const connectionURI = await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: " Lax " })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "None " })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "none");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: " STRICT " })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "strict");

            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "random " })],
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
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: " " })],
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "lax" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "none" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "none");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "strict" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "strict");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");

            resetAll();
        }
    });

    it("sameSite none invalid domain values", async function () {
        const connectionURI = await startST();
        const domainCombinations = [
            ["http://localhost:3000", "http://supertokensapi.io"],
            ["http://127.0.0.1:3000", "http://supertokensapi.io"],
            ["http://supertokens.io", "http://localhost:8000"],
            ["http://supertokens.io", "http://127.0.0.1:8000"],
            ["http://supertokens.io", "http://supertokensapi.io"],
        ];

        for (const domainCombination of domainCombinations) {
            let err;
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    appName: "SuperTokens",
                    websiteDomain: domainCombination[0],
                    apiDomain: domainCombination[1],
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "none" })],
            });
            try {
                await Session.createNewSession(
                    mockRequest(),
                    mockResponse(),
                    "public",
                    STExpress.convertToRecipeUserId("asdf")
                );
            } catch (e) {
                err = e;
            }
            assert.ok(err);
            assert.strictEqual(
                err.message,
                "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
            );
            resetAll();
        }
    });

    it("sameSite none valid domain values", async function () {
        const domainCombinations = [
            ["http://localhost:3000", "http://localhost:8000"],
            ["http://127.0.0.1:3000", "http://localhost:8000"],
            ["http://localhost:3000", "http://127.0.0.1:8000"],
            ["http://127.0.0.1:3000", "http://127.0.0.1:8000"],

            ["https://localhost:3000", "https://localhost:8000"],
            ["https://127.0.0.1:3000", "https://localhost:8000"],
            ["https://localhost:3000", "https://127.0.0.1:8000"],
            ["https://127.0.0.1:3000", "https://127.0.0.1:8000"],

            ["https://supertokens.io", "https://api.supertokens.io"],
            ["https://supertokens.io", "https://supertokensapi.io"],

            ["http://localhost:3000", "https://supertokensapi.io"],
            ["http://127.0.0.1:3000", "https://supertokensapi.io"],
        ];

        for (const domainCombination of domainCombinations) {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        websiteDomain: domainCombination[0],
                        apiDomain: domainCombination[1],
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSameSite: "none" })],
                });
            } catch (e) {
                assert(false);
            }
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
        const connectionURI = await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", accessTokenPath: "/access" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.accessTokenPath.getAsStringDangerous() === "/access");
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.accessTokenPath.getAsStringDangerous() === "");
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/custom/a",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                    connectionURI,
                    apiKey: "haha",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            assert(Querier.apiKey === "haha");
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/custom",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", sessionExpiredStatusCode: 402 })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode === 402);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI: `${connectionURI};try.supertokens.io;try.supertokens.io:8080;localhost:90`,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "https://api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "https://api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.com",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "none");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.co.uk",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.co.uk",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_CUSTOM_HEADER" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "VIA_CUSTOM_HEADER");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "none");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === true);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "127.0.0.1:9000",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString({}) === "NONE");
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "lax");
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure === false);
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "https://127.0.0.1:3000",
                    appName: "SuperTokens",
                    websiteDomain: "google.com",
                    apiBasePath: "test/",
                    websiteBasePath: "test1/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "NONE" })],
            });
            assert(SessionRecipe.getInstanceOrThrowError().config.antiCsrfFunctionOrString === "NONE");
            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "127.0.0.1:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "RANDOM" })],
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
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "http://api.test.com:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
                });
                await Session.createNewSession(
                    mockRequest(),
                    mockResponse(),
                    "public",
                    STExpress.convertToRecipeUserId("userId")
                );
                assert(false);
            } catch (err) {
                assert.strictEqual(
                    err.message,
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                );
            }
            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "https://api.test.com:3000",
                        appName: "SuperTokens",
                        websiteDomain: "google.com",
                        apiBasePath: "test/",
                        websiteBasePath: "test1/",
                    },
                    recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", cookieSecure: false })],
                });
                await Session.createNewSession(
                    mockRequest(),
                    mockResponse(),
                    "public",
                    STExpress.convertToRecipeUserId("userId")
                );
                assert(false);
            } catch (err) {
                assert.strictEqual(
                    err.message,
                    "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
                );
            }
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
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
                        getTokenTransferMethod: () => "cookie",
                        getTokenTransferMethod: () => "header",
                        cookieSecure: false,
                    }),
                ],
            });
            await Session.createNewSession(
                mockRequest(),
                mockResponse(),
                "public",
                STExpress.convertToRecipeUserId("userId")
            );
            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "https://localhost",
                    appName: "Supertokens",
                    websiteDomain: "http://localhost:3000",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure);
            assert(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}) === "none");

            resetAll();
        }
    });

    it("testing that the debug mode is set", async function () {
        const connectionURI = await startST();
        let logs = []; // Used to capture the log strings
        debug.log = function (...args) {
            logs.push(args);
        };

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
                debug: true,
            });
            logDebugMessage("test message successfully logged");
            assert(logs.length > 0);
            const logMessage = logs[logs.length - 1].find((log) => log.includes("test message successfully logged"));
            assert(logMessage !== undefined);
            resetAll();
        }

        {
            logs = [];
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
                debug: false,
            });
            logDebugMessage("test message - should not be logged");
            assert(logs.length === 0);
            resetAll();
        }

        {
            logs = [];
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            logDebugMessage("test message - should not be logged");
            assert(logs.length === 0);
            resetAll();
        }
    });

    it("testing that the debug mode is set via env var", async function () {
        let oldEnv = process.env;
        const connectionURI = await startST();
        let logs = []; // Used to capture the log strings
        debug.log = function (...args) {
            logs.push(args);
        };

        {
            process.env = { ...oldEnv, DEBUG: "com.supertokens" };
            let debugManual = require("debug/src/common");
            debugManual(debug);
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            logDebugMessage("test message successfully logged");
            assert(logs.length > 0);
            const logMessage = logs[logs.length - 1].find((log) => log.includes("test message successfully logged"));
            assert(logMessage !== undefined);
            resetAll(false);
        }

        process.env = { ...oldEnv };
        let debugManual = require("debug/src/common");
        debugManual(debug);

        {
            logs = [];
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });
            logDebugMessage("test message - should not be logged");
            assert(logs.length === 0);
            resetAll();
        }
    });

    it("checking for default cookie config", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieDomain, undefined);
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}), "lax");
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieSecure, true);
        assert.equal(
            SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous(),
            "/auth/session/refresh"
        );
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode, 401);
    });

    it("Test that the JWKS and OpenId endpoints are exposed by Session", async function () {
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
        });
        const apis = SessionRecipe.getInstanceOrThrowError().getAPIsHandled();
        const jwksApi = apis.find((f) => f.id === "/jwt/jwks.json");
        assert.ok(jwksApi);
        assert.equal(jwksApi.pathWithoutApiBasePath.getAsStringDangerous(), "/jwt/jwks.json");
        const openidApi = apis.find((f) => f.id === "/.well-known/openid-configuration");
        assert.ok(openidApi);
        assert.equal(openidApi.pathWithoutApiBasePath.getAsStringDangerous(), "/.well-known/openid-configuration");
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
        assert.strictEqual(
            getTopLevelDomainForSameSiteResolution("https://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com:3001"),
            "ec2-xx-yyy-zzz-0.compute-1.amazonaws.com"
        );
    });

    it("should work well with ec2 public urls", async function () {
        const connectionURI = await startST();

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    appName: "Supertokens",
                    apiDomain: "https://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com:3001",
                    websiteDomain: "https://blog.supertokens.com",
                    apiBasePath: "/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.cookieDomain, undefined);
            assert(SessionRecipe.getInstanceOrThrowError().config.cookieSecure);
            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}), "none");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    appName: "Supertokens",
                    apiDomain: "http://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com:3001",
                    websiteDomain: "http://ec2-aa-bbb-ccc-0.compute-1.amazonaws.com:3000",
                    apiBasePath: "/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.cookieDomain, undefined);
            assert(!SessionRecipe.getInstanceOrThrowError().config.cookieSecure);
            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}), "none");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    appName: "Supertokens",
                    apiDomain: "http://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com:3001",
                    websiteDomain: "http://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com:3000",
                    apiBasePath: "/",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.cookieDomain, undefined);
            assert(!SessionRecipe.getInstanceOrThrowError().config.cookieSecure);
            assert.strictEqual(SessionRecipe.getInstanceOrThrowError().config.getCookieSameSite({}), "lax");

            resetAll();
        }
    });

    it("apiGatewayPath test", async function () {
        const connectionURI = await startST();
        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiGatewayPath: "/gateway",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(""), {}, {});
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
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "hello",
                    apiGatewayPath: "/gateway",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(""), {}, {});
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
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                    apiBasePath: "hello",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
            });

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "public", STExpress.convertToRecipeUserId(""), {}, {});
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
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
        const connectionURI = await startST();
        let errorCaught = true;
        try {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" }), , EmailPassword.init()],
            });
            errorCaught = false;
        } catch (err) {
            assert.strictEqual(err.message, "Please remove empty items from recipeList");
        }
        assert(errorCaught);
    });

    it("Check that telemetry is set to true properly", async function () {
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
            recipeList: [Session.init()],
            telemetry: true,
        });

        assert(SuperTokens.getInstanceOrThrowError().telemetryEnabled === true);
    });

    it("Check that telemetry is set to false by default", async function () {
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
            recipeList: [Session.init()],
        });

        assert(SuperTokens.getInstanceOrThrowError().telemetryEnabled === false);
    });

    it("Check that telemetry is set to false properly", async function () {
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
            recipeList: [Session.init()],
            telemetry: false,
        });

        assert(SuperTokens.getInstanceOrThrowError().telemetryEnabled === false);
    });

    it("Test that init throws if both website domain and origin is undefined", async function () {
        const connectionURI = await startST();
        try {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                },
                recipeList: [Session.init()],
                telemetry: false,
            });
            throw new Error("Init should have failed but didnt");
        } catch (e) {
            if (
                e.message !==
                "Please provide either origin or websiteDomain inside the appInfo object when calling supertokens.init"
            ) {
                throw e;
            }
        }
    });

    it("Test that init works fine when using origin", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: "supertokens.io",
            },
            recipeList: [Session.init()],
            telemetry: false,
        });

        let originFromConfig = SuperTokens.getInstanceOrThrowError().appInfo.getOrigin();
        assert.equal(originFromConfig.getAsStringDangerous(), "https://supertokens.io");
    });

    it("Test that init works fine when using a function for origin", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: () => "supertokens.io",
            },
            recipeList: [Session.init()],
            telemetry: false,
        });

        let originFromConfig = SuperTokens.getInstanceOrThrowError().appInfo.getOrigin();
        assert.equal(originFromConfig.getAsStringDangerous(), "https://supertokens.io");
    });

    it("Test that origin function returns correctly", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                origin: ({ userContext }) => userContext.url,
            },
            recipeList: [Session.init()],
            telemetry: false,
        });

        let originFromConfig = SuperTokens.getInstanceOrThrowError().appInfo.getOrigin({
            request: undefined,
            userContext: {
                url: "https://test.com",
            },
        });
        assert.equal(originFromConfig.getAsStringDangerous(), "https://test.com");
    });

    it("Test that if both website domain and origin are provided, origin is used", async function () {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "test.com",
                origin: "supertokens.io",
            },
            recipeList: [Session.init()],
            telemetry: false,
        });

        let originFromConfig = SuperTokens.getInstanceOrThrowError().appInfo.getOrigin();
        assert.equal(originFromConfig.getAsStringDangerous(), "https://supertokens.io");
    });
});
