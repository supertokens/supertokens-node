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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("../../utils");
const assert = require("assert");
const { ProcessState } = require("../../../lib/build/processState");
const SuperTokens = require("../../../");
const Session = require("../../../recipe/session");
const { default: SessionClass } = require("../../../lib/build/recipe/session/sessionClass");
const { verifySession } = require("../../../recipe/session/framework/express");
const { middleware, errorHandler } = require("../../../framework/express");
const { PrimitiveClaim } = require("../../../lib/build/recipe/session/claimBaseClasses/primitiveClaim");
const express = require("express");
const request = require("supertest");
const { TrueClaim, UndefinedClaim } = require("./testClaims");
const sinon = require("sinon");
const { default: SessionError } = require("../../../lib/build/recipe/session/error");

describe(`session: ${printPath("[test/session/claims/verifySession.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    afterEach(function () {
        sinon.restore();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("verifySession", () => {
        describe("with getSession override", () => {
            it("should allow without claims required or present", async function () {
                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);
                await testGet(app, session, "/default-claims", 200);
            });

            it("should allow with claim valid after refetching", async function () {
                await startST();
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        TrueClaim.validators.hasValue(true),
                                    ],
                                }),
                            },
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);
                await testGet(app, session, "/default-claims", 200);
            });

            it("should reject with claim required but not added", async function () {
                await startST();
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        UndefinedClaim.validators.hasValue(true),
                                    ],
                                }),
                            },
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);
                const resp = await testGet(app, session, "/default-claims", 403);

                validateErrorResp(resp, [{ id: "st-undef", reason: { message: "wrong value", expectedValue: true } }]);
            });

            it("should allow with custom validator returning true", async function () {
                await startST();
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: true }),
                };
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        customValidator,
                                    ],
                                }),
                            },
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);
                await testGet(app, session, "/default-claims", 200);
            });

            it("should reject with custom validator returning false", async function () {
                await startST();
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: false, reason: "testReason" }),
                };
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        customValidator,
                                    ],
                                }),
                            },
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);
                const resp = await testGet(app, session, "/default-claims", 403);

                validateErrorResp(resp, [{ id: "testid", reason: "testReason" }]);

                it("should reject with validator returning false with reason", async function () {
                    await startST();
                    const customValidator = {
                        id: "testid",
                        validate: () => ({ isValid: false, reason: "testReason" }),
                    };
                    SuperTokens.init({
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
                                override: {
                                    functions: (oI) => ({
                                        ...oI,
                                        getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                            ...defaultClaimValidators,
                                            customValidator,
                                        ],
                                    }),
                                },
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const session = await createSession(app);
                    const resp = await testGet(app, session, "/default-claims", 403);

                    validateErrorResp(resp, [{ id: "testid", reason: "testReason" }]);
                });

                it("should reject if assertClaims returns an error", async function () {
                    const obj = {};
                    const testValidatorArr = [obj];
                    const mock = sinon.mock(SessionClass.prototype);
                    mock.expects("assertClaims")
                        .once()
                        .withArgs(testValidatorArr)
                        .rejects(
                            new SessionError({
                                type: "INVALID_CLAIM",
                                message: "INVALID_CLAIM",
                                payload: [
                                    {
                                        id: "testid",
                                        reason: "testReason",
                                    },
                                ],
                            })
                        );

                    await startST();
                    SuperTokens.init({
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
                                antiCsrf: "VIA_TOKEN",
                                override: {
                                    functions: (oI) => ({ ...oI, getGlobalClaimValidators: () => testValidatorArr }),
                                },
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const session = await createSession(app);

                    const res = await testGet(app, session, "/default-claims", 403);
                    validateErrorResp(res, [{ id: "testid", reason: "testReason" }]);
                    mock.verify();
                });

                it("should allow if assertClaims returns undefined", async function () {
                    const obj = {};
                    const testValidatorArr = [obj];
                    const mock = sinon.mock(SessionClass.prototype);
                    mock.expects("assertClaims").once().withArgs(testValidatorArr).resolves(undefined);

                    await startST();
                    SuperTokens.init({
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
                                antiCsrf: "VIA_TOKEN",
                                override: {
                                    functions: (oI) => ({ ...oI, getGlobalClaimValidators: () => testValidatorArr }),
                                },
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const session = await createSession(app);

                    await testGet(app, session, "/default-claims", 200);
                    mock.verify();
                });
            });
        });

        describe("with overrideGlobalClaimValidators", () => {
            it("should allow with empty list as override", async function () {
                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        UndefinedClaim,
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/no-claims",
                        overrideGlobalClaimValidators: () => [],
                    },
                ]);

                const session = await createSession(app);
                await testGet(app, session, "/no-claims", 200);
            });

            it("should allow with refetched claim", async function () {
                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        UndefinedClaim,
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => [TrueClaim.validators.hasValue(true)],
                    },
                ]);

                const session = await createSession(app);
                await testGet(app, session, "/refetched-claim", 200);
            });

            it("should reject with invalid refetched claim", async function () {
                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        UndefinedClaim,
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => [TrueClaim.validators.hasValue(false)],
                    },
                ]);

                const session = await createSession(app);
                const res = await testGet(app, session, "/refetched-claim", 403);
                validateErrorResp(res, [
                    { id: "st-true", reason: { message: "wrong value", expectedValue: false, actualValue: true } },
                ]);
            });

            it("should reject with custom claim returning false", async function () {
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: false, reason: "testReason" }),
                };

                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        {
                                            id: "testid",
                                            reason: "testReason",
                                        },
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => [customValidator],
                    },
                ]);

                const session = await createSession(app);
                const res = await testGet(app, session, "/refetched-claim", 403);
                validateErrorResp(res, [{ id: "testid", reason: "testReason" }]);
            });

            it("should allow with custom claim returning true", async function () {
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: true }),
                };

                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        {
                                            id: "testid",
                                            reason: "testReason",
                                        },
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => [customValidator],
                    },
                ]);

                const session = await createSession(app);
                await testGet(app, session, "/refetched-claim", 200);
            });

            it("should reject with custom claim returning false", async function () {
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: false, reason: "testReason" }),
                };

                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        {
                                            id: "testid",
                                            reason: "testReason",
                                        },
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => [customValidator],
                    },
                ]);

                const session = await createSession(app);
                const res = await testGet(app, session, "/refetched-claim", 403);
                validateErrorResp(res, [{ id: "testid", reason: "testReason" }]);
            });

            it("should reject if assertClaims returns an error", async function () {
                const obj = { id: "ASDFASDF" };
                const testValidatorArr = [obj];
                const mock = sinon.mock(SessionClass.prototype);
                mock.expects("assertClaims")
                    .once()
                    .withArgs(testValidatorArr)
                    .rejects(
                        new SessionError({
                            type: "INVALID_CLAIM",
                            message: "INVALID_CLAIM",
                            payload: [
                                {
                                    id: "testid",
                                    reason: "testReason",
                                },
                            ],
                        })
                    );

                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        TrueClaim.validators.hasValue(true),
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => testValidatorArr,
                    },
                ]);

                const session = await createSession(app);

                const res = await testGet(app, session, "/refetched-claim", 403);
                validateErrorResp(res, [{ id: "testid", reason: "testReason" }]);
                mock.verify();
            });

            it("should allow if assertClaims returns undefined", async function () {
                const obj = {};
                const testValidatorArr = [obj];

                const mock = sinon.mock(SessionClass.prototype);
                console.log(SessionClass);
                mock.expects("assertClaims").once().withArgs(testValidatorArr).resolves(undefined);

                await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ defaultClaimValidators }) => [
                                        ...defaultClaimValidators,
                                        obj,
                                    ],
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp([
                    {
                        path: "/refetched-claim",
                        overrideGlobalClaimValidators: () => testValidatorArr,
                    },
                ]);

                const session = await createSession(app);

                await testGet(app, session, "/refetched-claim", 200);
                mock.verify();
            });
        });
    });
});

function validateErrorResp(resp, errors) {
    assert.ok(resp.headers["invalid-claim"]);
    const header = JSON.parse(resp.headers["invalid-claim"]);
    assert.ok(header);
    assert.deepEqual(header, errors);
}

async function createSession(app, body) {
    return extractInfoFromResponse(
        await new Promise((resolve, reject) =>
            request(app)
                .post(body !== undefined ? "create-with-claim" : "/create")
                .send(body)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        )
    );
}

function testGet(app, info, url, expectedStatus) {
    return new Promise((resolve, reject) =>
        request(app)
            .get(url)
            .set("Cookie", ["sAccessToken=" + info.accessToken + ";sIdRefreshToken=" + info.idRefreshTokenFromCookie])
            .set("anti-csrf", info.antiCsrf)
            .expect(expectedStatus)
            .end((err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            })
    );
}

function getTestApp(endpoints) {
    const app = express();

    app.use(middleware());

    app.use(express.json());

    app.post("/create", async (req, res) => {
        await Session.createNewSession(res, "testing-userId", req.body, {});
        res.status(200).json({ message: true });
    });

    app.post("/create-with-claim", async (req, res) => {
        const session = await Session.createNewSession(res, "testing-userId");
        new PrimitiveClaim(req.body.key).addToSession(session, req.body.value);
        res.status(200).json({ message: true });
    });

    app.get("/default-claims", verifySession(), async (req, res) => {
        res.status(200).json({ message: req.session.getHandle() });
    });

    if (endpoints !== undefined) {
        for (const { path, overrideGlobalClaimValidators } of endpoints) {
            app.get(path, verifySession({ overrideGlobalClaimValidators }), async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            });
        }
    }

    app.post("/logout", verifySession(), async (req, res) => {
        await req.session.revokeSession();
        res.status(200).json({ message: true });
    });

    app.use(errorHandler());
    return app;
}
