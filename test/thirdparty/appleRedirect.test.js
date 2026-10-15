/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, startST, killAllST, setupST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdParty = require("../../lib/build/recipe/thirdparty");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");

const appleProvider = {
    config: {
        thirdPartyId: "apple",
        clients: [
            {
                clientId: "4398792-io.supertokens.example.service",
                additionalConfig: {
                    keyId: "7M48Y4RYDL",
                    privateKey:
                        "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                    teamId: "YWQCXGJRJL",
                },
            },
        ],
    },
};

function encodeState(stateObj) {
    return Buffer.from(JSON.stringify(stateObj)).toString("base64");
}

async function setup({ appInfo = { websiteDomain: "https://app.example.com" }, thirdPartyConfig = {} } = {}) {
    const connectionURI = await startST();
    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "https://api.example.com",
            appName: "SuperTokens",
            ...appInfo,
        },
        recipeList: [
            Session.init({ getTokenTransferMethod: () => "cookie" }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [appleProvider],
                },
                ...thirdPartyConfig,
            }),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

async function postCallback(app, formData) {
    return request(app).post("/auth/callback/apple").type("form").send(formData);
}

function assertRejected(res) {
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.headers.location, undefined);
}

describe(`appleRedirectHandlerPOST: ${printPath("[test/thirdparty/appleRedirect.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    beforeEach(function () {
        ProcessState.getInstance().reset();
    });

    describe("redirect target validation", function () {
        const rejectedTargets = [
            ["a cross-origin URL", "https://evil.test/cb"],
            ["a URL with the configured host as userinfo", "https://app.example.com@evil.test/cb"],
            ["a URL with the configured host as a subdomain prefix", "https://app.example.com.evil.test/cb"],
            ["the configured host with a different scheme", "http://app.example.com/cb"],
            ["the configured host with a different port", "https://app.example.com:8443/cb"],
            ["a relative URL", "/auth/callback/apple"],
            ["a protocol-relative URL", "//evil.test/cb"],
            ["a javascript: URL", "javascript:alert(1)"],
            ["a custom-scheme URL", "myapp://callback"],
        ];

        for (const [description, frontendRedirectURI] of rejectedTargets) {
            it(`responds with 400 and no redirect for ${description}`, async function () {
                const app = await setup();
                const res = await postCallback(app, {
                    state: encodeState({ frontendRedirectURI }),
                    code: "testing",
                    id_token: "idtoken",
                });
                assertRejected(res);
            });
        }

        it("responds with 400 and no redirect if state is missing", async function () {
            const app = await setup();
            const res = await postCallback(app, { code: "testing" });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if state is empty", async function () {
            const app = await setup();
            const res = await postCallback(app, { state: "", code: "testing" });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if state is not base64", async function () {
            const app = await setup();
            const res = await postCallback(app, { state: "%%%not*base64%%%", code: "testing" });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if state does not decode to JSON", async function () {
            const app = await setup();
            const res = await postCallback(app, {
                state: Buffer.from("not json").toString("base64"),
                code: "testing",
            });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if state decodes to a JSON array", async function () {
            const app = await setup();
            const res = await postCallback(app, {
                state: encodeState(["https://app.example.com/cb"]),
                code: "testing",
            });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if frontendRedirectURI is missing", async function () {
            const app = await setup();
            const res = await postCallback(app, { state: encodeState({ other: "value" }), code: "testing" });
            assertRejected(res);
        });

        it("responds with 400 and no redirect if frontendRedirectURI is not a string", async function () {
            const app = await setup();
            const res = await postCallback(app, {
                state: encodeState({ frontendRedirectURI: { href: "https://app.example.com/cb" } }),
                code: "testing",
            });
            assertRejected(res);
        });
    });

    describe("same-origin redirect", function () {
        it("redirects with 303 and copies the posted fields onto the query", async function () {
            const app = await setup();
            const state = encodeState({ frontendRedirectURI: "https://app.example.com/auth/callback/apple" });
            const res = await postCallback(app, { state, code: "testing", id_token: "idtoken" });

            assert.strictEqual(res.status, 303);
            const location = new URL(res.headers.location);
            assert.strictEqual(location.origin, "https://app.example.com");
            assert.strictEqual(location.pathname, "/auth/callback/apple");
            assert.strictEqual(location.searchParams.get("state"), state);
            assert.strictEqual(location.searchParams.get("code"), "testing");
            assert.strictEqual(location.searchParams.get("id_token"), "idtoken");
        });

        it("accepts a redirect matching a non-canonical configured origin", async function () {
            const app = await setup({ appInfo: { websiteDomain: "https://App.Example.com:443" } });
            const state = encodeState({ frontendRedirectURI: "https://app.example.com/auth/callback/apple" });
            const res = await postCallback(app, { state, code: "testing" });

            assert.strictEqual(res.status, 303);
            const location = new URL(res.headers.location);
            assert.strictEqual(location.host, "app.example.com");
            assert.strictEqual(location.searchParams.get("code"), "testing");
        });

        it("accepts a redirect with an explicit default port", async function () {
            const app = await setup();
            const state = encodeState({ frontendRedirectURI: "https://APP.example.com:443/auth/callback/apple" });
            const res = await postCallback(app, { state, code: "testing" });

            assert.strictEqual(res.status, 303);
            assert.strictEqual(new URL(res.headers.location).searchParams.get("code"), "testing");
        });

        it("compares against an origin computed from the request", async function () {
            const app = await setup({
                appInfo: {
                    origin: ({ request }) =>
                        request?.getHeaderValue("x-site") === "b" ? "https://b.example.com" : "https://a.example.com",
                },
            });

            const state = encodeState({ frontendRedirectURI: "https://b.example.com/auth/callback/apple" });
            const allowed = await request(app)
                .post("/auth/callback/apple")
                .set("x-site", "b")
                .type("form")
                .send({ state, code: "testing" });
            assert.strictEqual(allowed.status, 303);

            const rejected = await postCallback(app, { state, code: "testing" });
            assertRejected(rejected);
        });
    });

    describe("isValidFrontendRedirectURI", function () {
        it("allows a cross-origin target if it returns true", async function () {
            let calledWith;
            const app = await setup({
                thirdPartyConfig: {
                    isValidFrontendRedirectURI: async (input) => {
                        calledWith = input;
                        return true;
                    },
                },
            });
            const frontendRedirectURI = "https://other.example.org/auth/callback/apple";
            const state = encodeState({ frontendRedirectURI });
            const res = await postCallback(app, { state, code: "testing", id_token: "idtoken" });

            assert.strictEqual(res.status, 303);
            const location = new URL(res.headers.location);
            assert.strictEqual(location.origin, "https://other.example.org");
            assert.strictEqual(location.searchParams.get("code"), "testing");
            assert.strictEqual(location.searchParams.get("id_token"), "idtoken");
            assert.strictEqual(calledWith.frontendRedirectURI, frontendRedirectURI);
            assert.notStrictEqual(calledWith.request, undefined);
            assert.notStrictEqual(calledWith.userContext, undefined);
        });

        for (const [frontendRedirectURI, expected] of [
            ["https://app.example.com", "https://app.example.com/"],
            [" https://other.example.org/cb", "https://other.example.org/cb"],
            ["https://app.example.com\\@evil.test/cb", "https://app.example.com/@evil.test/cb"],
            ["HTTPS://App.Example.com/a/../cb", "https://app.example.com/cb"],
        ]) {
            it(`passes ${JSON.stringify(
                frontendRedirectURI
            )} in the normalised form it redirects to`, async function () {
                let calledWith;
                const app = await setup({
                    thirdPartyConfig: {
                        isValidFrontendRedirectURI: (input) => {
                            calledWith = input.frontendRedirectURI;
                            return true;
                        },
                    },
                });
                const state = encodeState({ frontendRedirectURI });
                const res = await postCallback(app, { state, code: "testing" });

                assert.strictEqual(res.status, 303);
                assert.strictEqual(calledWith, expected);
                const location = new URL(res.headers.location);
                location.search = "";
                assert.strictEqual(location.toString(), expected);
            });
        }

        it("blocks a same-origin target if it returns false", async function () {
            const app = await setup({
                thirdPartyConfig: {
                    isValidFrontendRedirectURI: () => false,
                },
            });
            const state = encodeState({ frontendRedirectURI: "https://app.example.com/auth/callback/apple" });
            const res = await postCallback(app, { state, code: "testing" });
            assertRejected(res);
        });

        it("does not redirect if it throws", async function () {
            const app = await setup({
                thirdPartyConfig: {
                    isValidFrontendRedirectURI: () => {
                        throw new Error("validation failed");
                    },
                },
            });
            const state = encodeState({ frontendRedirectURI: "https://app.example.com/auth/callback/apple" });
            const res = await postCallback(app, { state, code: "testing" });
            assert.strictEqual(res.status, 500);
            assert.strictEqual(res.headers.location, undefined);
        });

        for (const frontendRedirectURI of [
            "myapp://callback",
            "myapp:callback",
            "com.example.app:/oauth2redirect",
            "intent://callback#Intent;package=com.example.app;scheme=signinwithapple;end",
        ]) {
            it(`allows the custom-scheme target ${frontendRedirectURI} if it returns true`, async function () {
                let calledWith;
                const app = await setup({
                    thirdPartyConfig: {
                        isValidFrontendRedirectURI: (input) => {
                            calledWith = input.frontendRedirectURI;
                            return true;
                        },
                    },
                });
                const state = encodeState({ frontendRedirectURI });
                const res = await postCallback(app, { state, code: "testing" });

                assert.strictEqual(res.status, 303);
                assert.strictEqual(calledWith, frontendRedirectURI);
                const location = new URL(res.headers.location);
                const expected = new URL(frontendRedirectURI);
                assert.strictEqual(location.protocol, expected.protocol);
                assert.strictEqual(location.host, expected.host);
                assert.strictEqual(location.pathname, expected.pathname);
                assert.strictEqual(location.hash, expected.hash);
                assert.strictEqual(location.searchParams.get("code"), "testing");
                assert.strictEqual(location.searchParams.get("state"), state);
            });
        }

        for (const frontendRedirectURI of [
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "vbscript:msgbox(1)",
            "file:///etc/passwd",
            "blob:https://app.example.com/1f0e5f3c",
            "about:blank",
            "filesystem:https://app.example.com/temporary/x",
            "/auth/callback/apple",
            "//evil.test/cb",
        ]) {
            it(`rejects ${frontendRedirectURI} even if it would return true`, async function () {
                let called = false;
                const app = await setup({
                    thirdPartyConfig: {
                        isValidFrontendRedirectURI: () => {
                            called = true;
                            return true;
                        },
                    },
                });
                const state = encodeState({ frontendRedirectURI });
                const res = await postCallback(app, { state, code: "testing" });
                assertRejected(res);
                assert.strictEqual(called, false);
            });
        }
    });
});
