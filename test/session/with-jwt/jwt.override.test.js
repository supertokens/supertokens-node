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

const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { middleware, errorHandler } = require("../../../framework/express");

/**
 * Test that overriding the jwt recipe functions and apis still work when the JWT feature is enabled
 */
describe(`session-with-jwt: ${printPath("[test/session/with-jwt/jwt.override.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test overriding functions", async function () {
        await startST();

        let jwtCreated = undefined;
        let jwksKeys = undefined;

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
                    getTokenTransferMethod: () => "cookie",
                    jwt: { enable: true },
                    override: {
                        openIdFeature: {
                            jwtFeature: {
                                functions: function (originalImplementation) {
                                    return {
                                        ...originalImplementation,
                                        createJWT: async function (input) {
                                            let createJWTResponse = await originalImplementation.createJWT(input);

                                            if (createJWTResponse.status === "OK") {
                                                jwtCreated = createJWTResponse.jwt;
                                            }

                                            return createJWTResponse;
                                        },
                                        getJWKS: async function () {
                                            let getJWKSResponse = await originalImplementation.getJWKS();

                                            if (getJWKSResponse.status === "OK") {
                                                jwksKeys = getJWKSResponse.keys;
                                            }

                                            return getJWKSResponse;
                                        },
                                    };
                                },
                            },
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
            let session = await Session.createNewSession(req, res, "", {}, {});
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
        assert.notStrictEqual(jwtCreated, undefined);

        let sessionInformation = await Session.getSessionInformation(sessionHandle);
        assert.deepStrictEqual(jwtCreated, sessionInformation.accessTokenPayload.jwt);

        let getJWKSResponse = await new Promise((resolve) => {
            request(app)
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        assert.notStrictEqual(jwksKeys, undefined);
        assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys);
    });

    it("Test overriding APIs", async function () {
        await startST();

        let jwksKeys = undefined;

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
                    getTokenTransferMethod: () => "cookie",
                    jwt: { enable: true },
                    override: {
                        openIdFeature: {
                            jwtFeature: {
                                apis: function (originalImplementation) {
                                    return {
                                        ...originalImplementation,
                                        getJWKSGET: async function (input) {
                                            let response = await originalImplementation.getJWKSGET(input);
                                            jwksKeys = response.keys;
                                            return response;
                                        },
                                    };
                                },
                            },
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

        let getJWKSResponse = await new Promise((resolve) => {
            request(app)
                .get("/auth/jwt/jwks.json")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res.body);
                    }
                });
        });

        app.use(errorHandler());

        assert.notStrictEqual(jwksKeys, undefined);
        assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys);
    });
});
