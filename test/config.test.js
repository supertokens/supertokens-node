/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("./utils");
let STExpress = require("../");
let Session = require("../recipe/session");
let SessionRecipe = require("../lib/build/recipe/session/sessionRecipe").default;
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../lib/build/recipe/session/utils");
const { Querier } = require("../lib/build/querier");
let SuperTokens = require("../lib/build/supertokens").default;
let EmailPassword = require("../lib/build/recipe/emailpassword");

/**
 * TODO: test various inputs for appInfo (done)
 * TODO: test using zero, one and two recipe modules (done)
 * TODO: test config for session module (done)
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

    // * TODO: test various inputs for appInfo
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
            } catch (err) {
                if (
                    err.type !== STExpress.Error.GENERAL_ERROR ||
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
            } catch (err) {
                if (
                    err.type !== STExpress.Error.GENERAL_ERROR ||
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
            } catch (err) {
                if (
                    err.type !== STExpress.Error.GENERAL_ERROR ||
                    err.message !==
                        "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
                ) {
                    throw err;
                }
            }

            resetAll();
        }
    });

    // * TODO: test using zero, one and two recipe modules
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
                });
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

            assert(SuperTokens.getInstanceOrThrowError().recipeModules.length === 2);
            resetAll();
        }
    });

    // * TODO: test config for session module
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
                    sessionRefreshFeature: {
                        disableDefaultImplementation: true,
                    },
                    cookieSecure: true,
                }),
            ],
        });
        assert(SessionRecipe.getInstanceOrThrowError().config.cookieDomain === ".testdomain");
        assert(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode === 111);
        assert(
            SessionRecipe.getInstanceOrThrowError().config.sessionRefreshFeature.disableDefaultImplementation === true
        );
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
        assert(normaliseSessionScopeOrThrowError("", "api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "https://api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com?hello=1") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com/hello") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com/") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com:8080") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "http://api.example.com#random2") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "api.example.com/") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", "api.example.com#random") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("", ".example.com") === ".example.com");
        assert(normaliseSessionScopeOrThrowError("", "api.example.com/?hello=1&bye=2") === ".api.example.com");
        try {
            normaliseSessionScopeOrThrowError("", "http://");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid sessionScope" && err.rId === "");
        }
    });

    it("testing URL path normalisation", async function () {
        assert(normaliseURLPathOrThrowError("", "") === "");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com") === "");
        assert(normaliseURLPathOrThrowError("", "https://api.example.com") === "");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com?hello=1") === "");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/hello") === "/hello");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/") === "");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com:8080") === "");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com#random2") === "");
        assert(normaliseURLPathOrThrowError("", "api.example.com/") === "");
        assert(normaliseURLPathOrThrowError("", "api.example.com#random") === "");
        assert(normaliseURLPathOrThrowError("", ".example.com") === "");
        assert(normaliseURLPathOrThrowError("", "api.example.com/?hello=1&bye=2") === "");

        assert(normaliseURLPathOrThrowError("", "http://api.example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "http://1.2.3.4/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "1.2.3.4/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "https://api.example.com/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/hello/") === "/hello");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com:8080/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "http://api.example.com/one/two#random2") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "api.example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "api.example.com/one/two/#random") === "/one/two");
        assert(normaliseURLPathOrThrowError("", ".example.com/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "api.example.com/one/two?hello=1&bye=2") === "/one/two");

        assert(normaliseURLPathOrThrowError("", "/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "/one") === "/one");
        assert(normaliseURLPathOrThrowError("", "one") === "/one");
        assert(normaliseURLPathOrThrowError("", "one/") === "/one");
        assert(normaliseURLPathOrThrowError("", "/one/two/") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "/one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "one/two?hello=1") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "/one/two/#random") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "one/two#random") === "/one/two");

        assert(normaliseURLPathOrThrowError("", "localhost:4000/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "127.0.0.1:4000/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "127.0.0.1/one/two") === "/one/two");
        assert(normaliseURLPathOrThrowError("", "https://127.0.0.1:80/one/two") === "/one/two");
    });

    it("testing URL domain normalisation", async function () {
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "https://api.example.com") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com?hello=1") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com/hello") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com/") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com:8080") === "http://api.example.com:8080");
        assert(normaliseURLDomainOrThrowError("", "http://api.example.com#random2") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "api.example.com/") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "api.example.com") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "api.example.com#random") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", ".example.com") === "https://example.com");
        assert(normaliseURLDomainOrThrowError("", "api.example.com/?hello=1&bye=2") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "localhost") === "http://localhost");
        assert(normaliseURLDomainOrThrowError("", "https://localhost") === "https://localhost");

        assert(normaliseURLDomainOrThrowError("", "http://api.example.com/one/two") === "http://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "http://1.2.3.4/one/two") === "http://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("", "https://1.2.3.4/one/two") === "https://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("", "1.2.3.4/one/two") === "http://1.2.3.4");
        assert(normaliseURLDomainOrThrowError("", "https://api.example.com/one/two/") === "https://api.example.com");
        assert(
            normaliseURLDomainOrThrowError("", "http://api.example.com/one/two?hello=1") === "http://api.example.com"
        );
        assert(
            normaliseURLDomainOrThrowError("", "http://api.example.com/one/two#random2") === "http://api.example.com"
        );
        assert(normaliseURLDomainOrThrowError("", "api.example.com/one/two") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", "api.example.com/one/two/#random") === "https://api.example.com");
        assert(normaliseURLDomainOrThrowError("", ".example.com/one/two") === "https://example.com");
        assert(normaliseURLDomainOrThrowError("", "localhost:4000") === "http://localhost:4000");
        assert(normaliseURLDomainOrThrowError("", "127.0.0.1:4000") === "http://127.0.0.1:4000");
        assert(normaliseURLDomainOrThrowError("", "127.0.0.1") === "http://127.0.0.1");
        assert(normaliseURLDomainOrThrowError("", "https://127.0.0.1:80/") === "https://127.0.0.1:80");

        try {
            normaliseURLDomainOrThrowError("", "/one/two");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid domain name" && err.rId === "");
        }

        try {
            normaliseURLDomainOrThrowError("", "");
            assert(false);
        } catch (err) {
            assert(err.message === "Please provide a valid domain name" && err.rId === "");
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
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.cookieSecure, false);
        assert.equal(
            SessionRecipe.getInstanceOrThrowError().config.refreshTokenPath.getAsStringDangerous(),
            "/auth/session/refresh"
        );
        assert.equal(SessionRecipe.getInstanceOrThrowError().config.sessionExpiredStatusCode, 401);
    });
});
