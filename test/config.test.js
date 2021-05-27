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
    createServerlessCacheForTesting,
    extractInfoFromResponse,
} = require("./utils");
const request = require("supertest");
const express = require("express");
let STExpress = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../lib/build/recipe/session/utils");
const { Querier } = require("../lib/build/querier");
let SuperTokens = require("../lib/build/supertokens").default;
let ST = require("../");
let EmailPassword = require("../lib/build/recipe/emailpassword");
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
const { getTopLevelDomainForSameSiteResolution } = require("../lib/build/recipe/session/utils");
const { removeServerlessCache, storeIntoTempFolderForServerlessCache } = require("../lib/build/utils");

/**
 * TODO: (Later) test config for faunadb session module
 */

describe(`configTest: ${printPath("[test/config.test.js]")}`, function () {
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
                if (err.message !== 'Config schema error in init function: appInfo requires property "apiDomain"') {
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
                if (err.message !== 'Config schema error in init function: appInfo requires property "appName"') {
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
                if (err.message !== 'Config schema error in init function: appInfo requires property "websiteDomain"') {
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
                if (
                    err.type !== STExpress.Error.GENERAL_ERROR ||
                    err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
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
                if (
                    err.type !== STExpress.Error.GENERAL_ERROR ||
                    err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
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
        assert(normaliseURLPathOrThrowError("") === "");
        assert(normaliseURLPathOrThrowError("http://api.example.com") === "");
        assert(normaliseURLPathOrThrowError("https://api.example.com") === "");
        assert(normaliseURLPathOrThrowError("http://api.example.com?hello=1") === "");
        assert(normaliseURLPathOrThrowError("http://api.example.com/hello") === "/hello");
        assert(normaliseURLPathOrThrowError("http://api.example.com/") === "");
        assert(normaliseURLPathOrThrowError("http://api.example.com:8080") === "");
        assert(normaliseURLPathOrThrowError("http://api.example.com#random2") === "");
        assert(normaliseURLPathOrThrowError("api.example.com/") === "");
        assert(normaliseURLPathOrThrowError("api.example.com#random") === "");
        assert(normaliseURLPathOrThrowError(".example.com") === "");
        assert(normaliseURLPathOrThrowError("api.example.com/?hello=1&bye=2") === "");

        assert(normaliseURLPathOrThrowError("http://api.example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("http://1.2.3.4/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("1.2.3.4/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("https://api.example.com/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("http://api.example.com/one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("http://api.example.com/hello/") === "/hello");
        assert(normaliseURLPathOrThrowError("http://api.example.com/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("http://api.example.com:8080/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("http://api.example.com/one/two#random2") === "/one/two");
        assert(normaliseURLPathOrThrowError("api.example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("api.example.com/one/two/#random") === "/one/two");
        assert(normaliseURLPathOrThrowError(".example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("api.example.com/one/two?hello=1&bye=2") === "/one/two");

        assert(normaliseURLPathOrThrowError("/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("/one") === "/one");
        assert(normaliseURLPathOrThrowError("one") === "/one");
        assert(normaliseURLPathOrThrowError("one/") === "/one");
        assert(normaliseURLPathOrThrowError("/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("/one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("/one/two/#random") === "/one/two");
        assert(normaliseURLPathOrThrowError("one/two#random") === "/one/two");
        assert(normaliseURLPathOrThrowError("localhost:4000/one/two") === "/one/two");

        assert(normaliseURLPathOrThrowError("127.0.0.1:4000/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("127.0.0.1/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("https://127.0.0.1:80/one/two") === "/one/two");

        assert(normaliseURLPathOrThrowError("/auth/email/exists?email=john.doe%40gmail.com") === "/auth/email/exists");
        assert(normaliseURLPathOrThrowError("exists") === "/exists");
        assert(normaliseURLPathOrThrowError("exists?email=john.doe%40gmail.com") === "/exists");

        assert(normaliseURLPathOrThrowError("/.netlify/functions/api") === "/.netlify/functions/api");
        assert(normaliseURLPathOrThrowError("/netlify/.functions/api") === "/netlify/.functions/api");
        assert(normaliseURLPathOrThrowError("app.example.com/.netlify/functions/api") === "/.netlify/functions/api");
        assert(normaliseURLPathOrThrowError("app.example.com/netlify/.functions/api") === "/netlify/.functions/api");
        assert(normaliseURLPathOrThrowError("/app.example.com") === "/app.example.com");

        assert(normaliseURLPathOrThrowError(".netlify/functions/api") === "/functions/api");
        assert(normaliseURLPathOrThrowError("netlify/.functions/api") === "/netlify/.functions/api");
    });

    it("testing URL domain normalisation", async function () {
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
            normaliseURLDomainOrThrowError("");
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

            assert(hosts[0].getAsStringDangerous() === "http://localhost:8080");
            assert(hosts[1].getAsStringDangerous() === "https://try.supertokens.io");
            assert(hosts[2].getAsStringDangerous() === "https://try.supertokens.io:8080");
            assert(hosts[3].getAsStringDangerous() === "http://localhost:90");
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
                    apiDomain: "http://api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
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
    });

    it("test config schema", async function () {
        await startST();

        {
            try {
                STExpress.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
                    },
                    aProperty: 3,
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (
                    err.message !==
                    'Config schema error in init function: input config is not allowed to have the additional property "aProperty". Did you mean to set this on the frontend side?'
                ) {
                    throw err;
                }
            }

            resetAll();
        }

        {
            try {
                STExpress.init({
                    supertokens: {},
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (
                    err.message !==
                    'Config schema error in init function: supertokens requires property "connectionURI"'
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
                        connectionURI: true,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (
                    err.message !==
                    "Config schema error in init function: supertokens.connectionURI is not of a type(s) string"
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
                        a: "b",
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (
                    err.message !==
                    'Config schema error in init function: supertokens is not allowed to have the additional property "a". Did you mean to set this on the frontend side?'
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
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (err.message !== 'Config schema error in init function: appInfo requires property "apiDomain"') {
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
                        apiBasePath: "/custom/a",
                    },
                    recipeList: [Session.init()],
                });
            } catch (err) {
                if (err.message !== 'Config schema error in init function: appInfo requires property "appName"') {
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
                        appName: "Supertokens",
                        websiteDomain: "supertokens.io",
                        apiBasePath: "/custom/a",
                    },
                });
            } catch (err) {
                if (
                    err.message !== 'Config schema error in init function: input config requires property "recipeList"'
                ) {
                    throw err;
                }
            }

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

    it("testing no calls to the core are happening (on supertokens.init) if the cache files exist with proper values", async function () {
        await startST();
        {
            let verifyRequestHelperState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER,
                2000
            );
            assert(verifyRequestHelperState === undefined);

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                isInServerlessEnv: true,
                recipeList: [Session.init()],
            });

            verifyRequestHelperState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER,
                2000
            );
            assert(verifyRequestHelperState !== undefined);
            resetAll();
        }

        ProcessState.getInstance().reset();

        {
            let verifyRequestHelperState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER,
                2000
            );
            assert(verifyRequestHelperState === undefined);

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                isInServerlessEnv: true,
                recipeList: [Session.init()],
            });

            verifyRequestHelperState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_REQUEST_HELPER,
                2000
            );
            assert(verifyRequestHelperState === undefined);
            resetAll();
        }
    });

    it("testing that the api version loaded and the handshake info loaded from the cache are correct", async function () {
        await startST();
        let handshakeInfo;
        let apiVersion;
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
                isInServerlessEnv: true,
                recipeList: [Session.init()],
            });

            handshakeInfo = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
            assert.notStrictEqual(handshakeInfo, undefined);
            apiVersion = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
            assert.notStrictEqual(apiVersion, undefined);
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
                isInServerlessEnv: true,
                recipeList: [Session.init()],
            });

            let handshakeInfo2 = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo();
            assert.notStrictEqual(handshakeInfo2, undefined);
            let apiVersion2 = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
            assert.notStrictEqual(apiVersion2, undefined);
            assert.deepStrictEqual(handshakeInfo, handshakeInfo2);
            assert.strictEqual(apiVersion, apiVersion2);
            resetAll();
        }
    });

    it("testing storeIntoTempFolderForServerlessCache doesn't throw error if the filePath doesn't exists", async function () {
        try {
            await storeIntoTempFolderForServerlessCache("/random/path/to/some/file", "data");
            assert(true);
        } catch (err) {
            throw err;
        }
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

            app.use(ST.middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "", {}, {});
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

            app.use(ST.middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "", {}, {});
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

            app.use(ST.middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, "", {}, {});
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
});
