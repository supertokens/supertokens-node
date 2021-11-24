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
                        resolve(res.body);
                    }
                })
        );

        let sessionHandle = createJWTResponse.sessionHandle;
        let accessTokenPayloadJWT = await (await Session.getSessionInformation(sessionHandle)).accessTokenPayload.jwt;

        assert.notStrictEqual(accessTokenPayloadJWT, undefined);

        let jwtpayload = accessTokenPayloadJWT.split(".")[1];
        let decodedJWTPayload = Buffer.from(jwtpayload, "base64").toString("utf-8");
        let jwtPayloadJSON = JSON.parse(decodedJWTPayload);

        assert(jwtPayloadJSON.customKey === "customValue");
        assert(jwtPayloadJSON.customKey2 === "customValue2");
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

        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let accessTokenExpiryInSeconds = new Date(responseInfo.accessTokenExpiry).getTime() / 1000;
        let sessionHandle = createJWTResponse.body.sessionHandle;
        let sessionInformation = await Session.getSessionInformation(sessionHandle);

        let jwtPayload = sessionInformation.accessTokenPayload.jwt.split(".")[1];
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
        sessionInformation = await Session.getSessionInformation(sessionHandle);
        jwtPayload = sessionInformation.accessTokenPayload.jwt.split(".")[1];
        let newJWTExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

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

        let responseInfo = extractInfoFromResponse(createJWTResponse);
        let sessionHandle = createJWTResponse.body.sessionHandle;
        let sessionInformation = await Session.getSessionInformation(sessionHandle);

        let jwtPayload = sessionInformation.accessTokenPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

        await Session.updateAccessTokenPayload(sessionHandle, { newKey: "newValue" });

        sessionInformation = await Session.getSessionInformation(sessionHandle);
        jwtPayload = sessionInformation.accessTokenPayload.jwt.split(".")[1];
        let newJwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;

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

        assert.equal(accessTokenPayload.someKey, "someValue");
        assert.strictEqual(accessTokenPayload.jwt, undefined);
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

        let sessionHandle = createJWTResponse.body.sessionHandle;
        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;
        let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

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

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.customClaim, "customValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");

        await Session.updateAccessTokenPayload(sessionHandle, { newCustomClaim: "newValue" });
        accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.strictEqual(accessTokenPayload.sub, "userId");
        assert.strictEqual(accessTokenPayload.iss, "https://api.supertokens.io");

        decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.newCustomClaim, "newValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");
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

        assert.notStrictEqual(decodedJWT, null);
        assert.strictEqual(decodedJWT.customClaim, "customValue");
        assert.strictEqual(decodedJWT["sub"], "userId");
        assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io");

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

        assert.notStrictEqual(refreshResponse.body.accessTokenPayload, undefined);
        assert.strictEqual(refreshResponse.body.accessTokenPayload.newClaim, "newValue");
    });

    it("Test that when property name is changed without using getPropertyNameFromAccessTokenPayload, refreshing the session results in the old jwt being present", async function () {
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
                    jwt: { enable: true, propertyNameInAccessTokenPayload: "newJwtKey" },
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

        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.notStrictEqual(accessTokenPayload.newJwtKey, undefined);
    });

    it("Test that when property name is changed and setting getPropertyNameFromAccessTokenPayload, refreshing the session results in the old jwt being removed", async function () {
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
                    jwt: {
                        enable: true,
                        propertyNameInAccessTokenPayload: "newJwtKey",
                        getPropertyNameFromAccessTokenPayload: (payload) => {
                            if (payload.jwt !== undefined) {
                                return "jwt";
                            }

                            return "newJwtKey";
                        },
                    },
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

        assert.strictEqual(accessTokenPayload.jwt, undefined);
        assert.notStrictEqual(accessTokenPayload.newJwtKey, undefined);
    });

    it("Test that when property name is changed using getPropertyNameFromAccessTokenPayload, updating access token payload results in the old jwt being present", async function () {
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
                    jwt: {
                        enable: true,
                        propertyNameInAccessTokenPayload: "newJwtKey",
                        getPropertyNameFromAccessTokenPayload: (payload) => {
                            if (payload.jwt !== undefined) {
                                return "jwt";
                            }

                            return "newJwtKey";
                        },
                    },
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

        await Session.updateAccessTokenPayload(sessionHandle);

        let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload;

        assert.notStrictEqual(accessTokenPayload.jwt, undefined);
        assert.strictEqual(accessTokenPayload.newJwtKey, undefined);
    });
});
