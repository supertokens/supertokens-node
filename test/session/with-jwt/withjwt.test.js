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
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { middleware, errorHandler } = require("../../../framework/express");

describe(`session-with-jwt: ${printPath("[test/session/with-jwt/withjwt.override.test.js]")}`, function () {
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
                    enableJWTFeature: true,
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
        let accessTokenPayloadJWT = await (await Session.getSessionInformation(sessionHandle)).jwtPayload.jwt;

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
                    enableJWTFeature: true,
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

        let jwtPayload = sessionInformation.jwtPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;
        let expiryDiff = jwtExpiryInSeconds - accessTokenExpiryInSeconds;

        // We check that JWT expiry is 30 seconds more than access token expiry. Accounting for a 5ms skew
        assert(27 <= expiryDiff && expiryDiff <= 32);
    });

    it.only("Test that when a session is refreshed, the JWT expiry is updated correctly", async function () {
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
                    enableJWTFeature: true,
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

        let jwtPayload = sessionInformation.jwtPayload.jwt.split(".")[1];
        let jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;
        let expiryDiff = jwtExpiryInSeconds - accessTokenExpiryInSeconds;

        // We check that JWT expiry is 30 seconds more than access token expiry. Accounting for a 5ms skew
        assert(27 <= expiryDiff && expiryDiff <= 32);

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", [
                    "sRefreshToken=" + responseInfo.refreshToken,
                    "sIdRefreshToken=" + responseInfo.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", responseInfo.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let getSessionResponse = await new Promise((resolve) =>
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

        sessionHandle = getSessionResponse.body.sessionHandle;
        responseInfo = extractInfoFromResponse(getSessionResponse);
        accessTokenExpiryInSeconds = new Date(responseInfo.accessTokenExpiry).getTime() / 1000;
        sessionInformation = await Session.getSessionInformation(sessionHandle);
        jwtPayload = sessionInformation.jwtPayload.jwt.split(".")[1];
        let newJWTExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, "base64").toString("utf-8")).exp;
    });
});
