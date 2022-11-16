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
const JsonWebToken = require("jsonwebtoken");

const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse, resetAll } = require("../../utils");
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { middleware, errorHandler } = require("../../../framework/express");
const { TrueClaim } = require("../claims/testClaims");

describe(`session-jwt-functions: ${printPath("[test/session/with-jwt/sessionClass.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that updating access token payload works", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.updateAccessTokenPayload({ newKey: "newValue" });

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.strictEqual(accessTokenPayload.sub, undefined);
        assert.strictEqual(accessTokenPayload.iss, undefined);
        assert.strictEqual(accessTokenPayload.newKey, "newValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(decodedJWT.newKey, "newValue");
    });

    it("Test that updating access token payload by mergeIntoAccessTokenPayload works", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.mergeIntoAccessTokenPayload({ newKey: "newValue" });

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.strictEqual(accessTokenPayload.sub, undefined);
        assert.strictEqual(accessTokenPayload.iss, undefined);
        assert.strictEqual(accessTokenPayload.newKey, "newValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(decodedJWT.newKey, "newValue");
    });

    it("Test that both access token payload and JWT have valid claims when calling update with a undefined payload", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customClaim: "customValue",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.updateAccessTokenPayload(undefined);

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.equal(accessTokenPayload.sub, undefined);
        assert.equal(accessTokenPayload.iss, undefined);
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.strictEqual(accessTokenPayload.customClaim, undefined);

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(decodedJWT.customClaim, undefined);
    });

    it("should update JWT when setting claim value by fetchAndSetClaim", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.fetchAndSetClaim(TrueClaim);

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.strictEqual(accessTokenPayload.sub, undefined);
        assert.strictEqual(accessTokenPayload.iss, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), true);
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), true);
    });

    it("should update JWT when setting claim value by setClaimValue", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.setClaimValue(TrueClaim, false);

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.strictEqual(accessTokenPayload.sub, undefined);
        assert.strictEqual(accessTokenPayload.iss, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), false);
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), false);
    });

    it("should update JWT when removing claim", async function () {
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
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({ res, userId, accessTokenPayload, sessionData }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({ res, userId, accessTokenPayload, sessionData });
                                },
                            };
                        },
                    },
                }),
            ],
        });

        // Only run for version >= 2.9
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.8") === "2.8") {
            return;
        }

        let app = express();

        app.use(middleware());
        app.use(express.json());

        app.post("/create", async (req, res) => {
            let session = await Session.createNewSession(res, "userId", {}, {});

            await session.setClaimValue(TrueClaim, true);
            await session.removeClaim(TrueClaim);

            res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() });
        });

        app.use(errorHandler());

        let createJWTResponse = await new Promise((resolve) =>
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
        );

        let accessTokenPayload = createJWTResponse.body.accessTokenPayload;
        assert.strictEqual(accessTokenPayload.sub, undefined);
        assert.strictEqual(accessTokenPayload.iss, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), undefined);
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
        assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), undefined);
    });
});
