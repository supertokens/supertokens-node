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
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");
let { CookieConfig } = require("../lib/build/cookieAndHeaders");
let {
    normaliseURLPathOrThrowError,
    normaliseSessionScopeOrThrowError,
    normaliseURLDomainOrThrowError,
} = require("../lib/build/utils");
const { Querier } = require("../lib/build/querier");
const { SessionConfig } = require("../lib/build/session");

/**
 * TODO: test various inputs for appInfo
 * TODO: test using zero, one and two recipe modules
 * TODO: test config for session module
 * TODO: test config for faunadb session module
 * TODO: test config for emailpassword module
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

    it("various sameSite values", async function () {
        await startST();

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: " Lax ",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "None ",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "none");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: " STRICT",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "strict");

            resetAll();
        }

        {
            try {
                STExpress.init({
                    hosts: "http://localhost:8080",
                    cookieSameSite: "random",
                });
            } catch (err) {
                if (
                    !ST.Error.isErrorFromAuth(err) ||
                    err.errType !== ST.Error.GENERAL_ERROR ||
                    err.err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
                    throw error;
                }
            }

            resetAll();
        }

        {
            try {
                STExpress.init({
                    hosts: "http://localhost:8080",
                    cookieSameSite: " ",
                });
            } catch (err) {
                if (
                    !ST.Error.isErrorFromAuth(err) ||
                    err.errType !== ST.Error.GENERAL_ERROR ||
                    err.err.message !== 'cookie same site must be one of "strict", "lax", or "none"'
                ) {
                    throw error;
                }
            }

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "lax",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "none",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "none");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                cookieSameSite: "strict",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "strict");

            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
            });

            assert(CookieConfig.getInstanceOrThrowError().cookieSameSite === "lax");

            resetAll();
        }
    });

    it("testing sessionScope normalisation", async function () {
        assert(normaliseSessionScopeOrThrowError("api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("https://api.example.com") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com?hello=1") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com/hello") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com/") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com:8080") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("http://api.example.com#random2") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com/") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com#random") === ".api.example.com");
        assert(normaliseSessionScopeOrThrowError(".example.com") === ".example.com");
        assert(normaliseSessionScopeOrThrowError("api.example.com/?hello=1&bye=2") === ".api.example.com");
        try {
            normaliseSessionScopeOrThrowError("http://");
            assert(false);
        } catch (err) {
            assert(err.err.message === "Please provide a valid sessionScope");
        }
    });

    it("testing URL path normalisation", async function () {
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
            assert(err.err.message === "Please provide a valid domain name");
        }
    });

    it("various config values", async function () {
        await startST();

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                apiBasePath: "/custom",
            });
            assert(CookieConfig.getInstanceOrThrowError().refreshTokenPath === "/custom/session/refresh");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                apiBasePath: "/",
            });
            assert(CookieConfig.getInstanceOrThrowError().refreshTokenPath === "/session/refresh");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
            });
            assert(CookieConfig.getInstanceOrThrowError().refreshTokenPath === "/auth/session/refresh");
            assert(CookieConfig.getInstanceOrThrowError().accessTokenPath === "/");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                accessTokenPath: "/api/a",
            });
            assert(CookieConfig.getInstanceOrThrowError().accessTokenPath === "/api/a");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                accessTokenPath: "/api/a/",
            });
            assert(CookieConfig.getInstanceOrThrowError().accessTokenPath === "/api/a");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                apiKey: "haha",
            });
            assert(Querier.getInstanceOrThrowError().apiKey === "haha");
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080",
                sessionExpiredStatusCode: 402,
            });
            assert(SessionConfig.getInstanceOrThrowError().sessionExpiredStatusCode === 402);
            resetAll();
        }

        {
            STExpress.init({
                hosts: "http://localhost:8080;try.supertokens.io;try.supertokens.io:8080;localhost:90",
            });
            let hosts = Querier.getInstanceOrThrowError().hosts;
            assert(hosts.length === 4);

            assert(hosts[0] === "http://localhost:8080");
            assert(hosts[1] === "https://try.supertokens.io");
            assert(hosts[2] === "https://try.supertokens.io:8080");
            assert(hosts[3] === "http://localhost:90");
            resetAll();
        }
    });
});
