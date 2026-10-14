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
const { printPath, createCoreApplication } = require("../utils");
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
    const connectionURI = await createCoreApplication();
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
});
