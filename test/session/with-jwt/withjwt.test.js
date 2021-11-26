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

const {
    printPath,
    setupST,
    startST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    resetAll,
    setKeyValueInConfig,
    delay,
} = require("../../utils");
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { middleware, errorHandler } = require("../../../framework/express");
let {
    setJWTExpiryOffsetSecondsForTesting,
} = require("../../../lib/build/recipe/session/with-jwt/recipeImplementation");

describe(`session-with-jwt: ${printPath("[test/session/with-jwt/withjwt.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that when creating a session with a custom access token payload, the payload has a jwt in it and the jwt has the user defined payload keys", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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
                        resolve(res.body);
                    }
                })
        );

        let sessionHandle = createJWTResponse.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let accessTokenPayloadJWT = accessTokenPayload.jwt;

        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(accessTokenPayloadJWT, undefined);

        let decodedJWTPayload = JsonWebToken.decode(accessTokenPayloadJWT);

        assert(decodedJWTPayload.customKey === "customValue");
        assert(decodedJWTPayload.customKey2 === "customValue2");
    });

    it("Test that when creating a session the JWT expiry is 30 seconds more than the access token expiry", async function () {
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
            let session = await Session.createNewSession(res, "", {}, {});
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let accessTokenExpiryInSeconds = new Date(responseInfo.accessTokenExpiry).getTime() / 1000;
        let sessionHandle = createJWTResponse.body.sessionHandle;
        let sessionInformation = await Session.getSessionInformation(sessionHandle);

        let jwtPayload = sessionInformation.accessTokenPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;
        let expiryDiff = jwtExpiryInSeconds - accessTokenExpiryInSeconds;

        // We check that JWT expiry is 30 seconds more than access token expiry. Accounting for a 5ms skew
        assert(27 <= expiryDiff && expiryDiff <= 32);
    });

    it("Test that when a session is refreshed, the JWT expiry is updated correctly", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
        });

        app.get("/getSession", async (req, res) => {
            let session = await Session.getSession(req, res);
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        let jwtPayload = accessTokenPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

        let delay = 5;
        await new Promise((res) => {
            setTimeout(() => {
                res();
            }, delay * 1000);
        });

        let refreshResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        responseInfo = extractInfoFromResponse(refreshResponse);
        accessTokenExpiryInSeconds = new Date(responseInfo.accessTokenExpiry).getTime() / 1000;
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        jwtPayload = accessTokenPayload.jwt.split(".")[1];
        let newJWTExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

        assert(accessTokenPayload.sub, "userId");
        assert(accessTokenPayload.iss, "https://api/supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        // Make sure that the new expiry is greater than the old one by the amount of delay before refresh, accounting for a second skew
        assert(
            newJWTExpiryInSeconds - jwtExpiryInSeconds === delay ||
                newJWTExpiryInSeconds - jwtExpiryInSeconds === delay + 1
        );
    });

    it("Test that when updating access token payload, jwt expiry does not change", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
        });

        app.get("/getSession", async (req, res) => {
            let session = await Session.getSession(req, res);
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        let jwtPayload = accessTokenPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

        await Session.updateAccessTokenPayload(sessionHandle, { newKey: "newValue" });

        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        jwtPayload = accessTokenPayload.jwt.split(".")[1];
        let newJwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

        assert(accessTokenPayload.sub, "userId");
        assert(accessTokenPayload.iss, "https://api/supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.equal(jwtExpiryInSeconds, newJwtExpiryInSeconds);
    });

    it("Test that for sessions created without jwt enabled, calling updateAccessTokenPayload after enabling jwt does not create a jwt", async function () {
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
            let session = await Session.createNewSession(res, "", {}, {});
            res.status(200).json({ sessionHandle: session.getHandle() });
        });

        app.get("/getSession", async (req, res) => {
            let session = await Session.getSession(req, res);
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.jwt, undefined);

        resetAll();

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

        await Session.updateAccessTokenPayload(sessionHandle, { someKey: "someValue" });
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.equal(accessTokenPayload.sub, undefined);
        assert.equal(accessTokenPayload.iss, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, undefined);
        assert.strictEqual(accessTokenPayload.jwt, undefined);
        assert.equal(accessTokenPayload.someKey, "someValue");
    });

    it("Test that for sessions created without jwt enabled, refreshing session after enabling jwt adds a JWT to the access token payload", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
        });

        app.get("/getSession", async (req, res) => {
            let session = await Session.getSession(req, res);
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.jwt, undefined);

        resetAll();

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

        await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
    });

    it("Test that when creating a session with jwt enabled, the sub claim gets added", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
    });

    it("Test that when creating a session with jwt enabled and using a custom sub claim, the custom claim value gets used", async function () {
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
                                        sub: "customsub",
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "customsub");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
    });

    it("Test that when creating a session with jwt enabled, the iss claim gets added", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["iss"], "https://api.supertokens.io");
    });

    it("Test that when creating a session with jwt enabled and using a custom iss claim, the custom claim value gets used", async function () {
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
                                        iss: "customIss",
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["iss"], "customIss");
    });

    it("Test that sub and iss claims are still present after calling updateAccessTokenPayload", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.customClaim, "customValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
        assert.strictEqual(decodedJWT._jwtPName, undefined);

        await Session.updateAccessTokenPayload(sessionHandle, { newCustomClaim: "newValue" });
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");

        decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.newCustomClaim, "newValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
    });

    it("Test that sub and iss claims are still present after refreshing the session", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.customClaim, "customValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
        assert.strictEqual(decodedJWT._jwtPName, undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");

        decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
    });

    it("Test that enabling JWT with a custom property name works as expected", async function () {
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
                    jwt: { enable: true, propertyNameInAccessTokenPayload: "customPropertyName" },
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload._jwtPName, "customPropertyName");
        assert.strictEqual(accessTokenPayload.jwt, undefined);
        assert.notStrictEqual(accessTokenPayload.customPropertyName, undefined);
    });

    it("Test that the JWT payload is maintained after updating the access token payload and refreshing the session", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
        });

        app.post("/refreshsession", async (req, res) => {
            let newSession = await Session.refreshSession(req, res);
            res.status(200).json({ accessTokenPayload: newSession.getAccessTokenPayload() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);
        await Session.updateAccessTokenPayload(sessionHandle, { newClaim: "newValue" });

        let refreshResponse = await new Promise((resolve) =>
            request(app)
                .post("/refreshsession")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.equal(refreshResponse.body.accessTokenPayload.sub, "userId");
        assert.equal(refreshResponse.body.accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(refreshResponse.body.accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(refreshResponse.body.accessTokenPayload, undefined);
        assert.strictEqual(refreshResponse.body.accessTokenPayload.newClaim, "newValue");
    });

    it("Test that access token payload has valid properties when creating, updating and refreshing", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.customClaim, "customValue");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");

        await Session.updateAccessTokenPayload(sessionHandle, { newKey: "newValue" });
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.customClaim, undefined);
        assert.strictEqual(accessTokenPayload.newKey, "newValue");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");

        await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        assert.strictEqual(accessTokenPayload.newKey, "newValue");
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");
    });

    it("Test that after changing the jwt property name, updating access token payload does not change the _jwtPName", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;

        resetAll();

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
                    jwt: { enable: true, propertyNameInAccessTokenPayload: "jwtProperty" },
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

        await Session.updateAccessTokenPayload(sessionHandle, { newKey: "newValue" });
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.newKey, "newValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload.jwtProperty, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");
    });

    it("Test that after changing the jwt property name, refreshing the session changes the _jwtPName", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);

        resetAll();

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
                    jwt: { enable: true, propertyNameInAccessTokenPayload: "jwtProperty" },
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

        await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.customClaim, "customValue");
        assert.strictEqual(accessTokenPayload.jwt, undefined);
        assert.notStrictEqual(accessTokenPayload.jwtProperty, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwtProperty");
    });

    it("Test that after access token expiry and JWT expiry and refreshing the session, the access token payload and JWT are valid", async function () {
        await setKeyValueInConfig("access_token_validity", 2);
        await startST();
        setJWTExpiryOffsetSecondsForTesting(2);
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let responseInfo = extractInfoFromResponse(createJWTResponse);

        await delay(5);

        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        let currentTimeInSeconds = Math.ceil(Date.now() / 1000);
        // Make sure that the JWT has expired
        assert(decodedJWT.exp < currentTimeInSeconds);
        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.customClaim, "customValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.customClaim, "customValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        // Make sure the JWT is not expired after refreshing
        decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        currentTimeInSeconds = Math.ceil(Date.now() / 1000);
        assert(decodedJWT.exp > currentTimeInSeconds);
    });

    it.only("Test that both access token payload and JWT have valid claims when calling update with a undefined payload", async function () {
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
            res.status(200).json({ sessionHandle: session.getHandle() });
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

        let sessionHandle = createJWTResponse.body.sessionHandle;

        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.customClaim, "customValue");
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
        assert.strictEqual(decodedJWT._jwtPName, undefined);

        await Session.updateAccessTokenPayload(sessionHandle, undefined);

        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        assert.equal(accessTokenPayload.sub, "userId");
        assert.equal(accessTokenPayload.iss, "https://api.supertokens.io");
        assert.strictEqual(accessTokenPayload.customClaim, undefined);
        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

        decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
        assert.strictEqual(decodedJWT._jwtPName, undefined);
    });
});
