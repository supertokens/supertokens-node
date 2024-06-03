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
const { default: RecipeUserId } = require("../../../lib/build/recipeUserId");

describe(`sessionClaims/verifySession: ${printPath("[test/session/claims/verifySession.test.js]")}`, function () {
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
        describe("with getGlobalClaimValidators override", () => {
            it("should allow without claims required or present", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
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

                const app = getTestApp();

                const session = await createSession(app);
                await testGet(app, session, "/default-claims", 200);
            });

            it("should allow with claim valid after refetching", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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
                const connectionURI = await startST();
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                validateErrorResp(resp, [
                    {
                        id: "st-undef",
                        reason: {
                            message: "value does not exist",
                            expectedValue: true,
                        },
                    },
                ]);
            });

            it("should allow with custom validator returning true", async function () {
                const connectionURI = await startST();
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: true }),
                };
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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
                const connectionURI = await startST();
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: false }),
                };
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                validateErrorResp(resp, [{ id: "testid" }]);
            });

            it("should reject with validator returning false with reason", async function () {
                const connectionURI = await startST();
                const customValidator = {
                    id: "testid",
                    validate: () => ({ isValid: false, reason: "testReason" }),
                };
                SuperTokens.init({
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
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                const validateClaims = sinon.expectation
                    .create("validateClaims")
                    .once()
                    .withArgs({
                        userId: "testing-userId",
                        recipeUserId: sinon.match
                            .has("recipeUserId", "testing-userId")
                            .and(sinon.match.instanceOf(RecipeUserId)),
                        accessTokenPayload: sinon.match.object,
                        claimValidators: testValidatorArr,
                        userContext: {
                            _default: sinon.match.any,
                        },
                    })
                    .resolves({
                        invalidClaims: [
                            {
                                id: "testid",
                                reason: "testReason",
                            },
                        ],
                    });
                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: () => testValidatorArr,
                                    validateClaims,
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);

                const res = await testGet(app, session, "/default-claims", 403);
                validateErrorResp(res, [{ id: "testid", reason: "testReason" }]);

                validateClaims.verify();
            });

            it("should allow if assertClaims returns no errors", async function () {
                const obj = {};
                const testValidatorArr = [obj];
                const validateClaims = sinon.expectation
                    .create("validateClaims")
                    .once()
                    .withArgs({
                        accessTokenPayload: sinon.match.object,
                        userId: "testing-userId",
                        recipeUserId: sinon.match
                            .has("recipeUserId", "testing-userId")
                            .and(sinon.match.instanceOf(RecipeUserId)),
                        claimValidators: testValidatorArr,
                        userContext: {
                            _default: sinon.match.any,
                        },
                    })
                    .resolves({
                        invalidClaims: [],
                    });
                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: () => testValidatorArr,
                                    validateClaims,
                                }),
                            },
                        }),
                    ],
                });

                const app = getTestApp();

                const session = await createSession(app);

                await testGet(app, session, "/default-claims", 200);
                validateClaims.verify();
            });
        });

        describe("with overrideGlobalClaimValidators", () => {
            it("should allow with empty list as override", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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
                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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
                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,
                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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

                const connectionURI = await startST();
                SuperTokens.init({
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
                            antiCsrf: "VIA_TOKEN",
                            override: {
                                functions: (oI) => ({
                                    ...oI,

                                    getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                                        ...claimValidatorsAddedByOtherRecipes,
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
        });
    });
});

function validateErrorResp(resp, errors) {
    assert.ok(resp.body);
    assert.strictEqual(resp.body.message, "invalid claim");
    assert.deepStrictEqual(resp.body.claimValidationErrors, errors);
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
            .set("Cookie", ["sAccessToken=" + info.accessToken])
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
        await Session.createNewSession(
            req,
            res,
            "public",
            SuperTokens.convertToRecipeUserId("testing-userId"),
            undefined,
            req.body,
            {}
        );
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
