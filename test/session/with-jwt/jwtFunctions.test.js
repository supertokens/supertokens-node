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
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");

describe(`session-jwt-functions: ${printPath("[test/session/with-jwt/jwtFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that JWT functions fail if the jwt feature is not enabled", async function () {
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
                    getTokenTransferMethod: () => "cookie",
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({
                                    req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                                }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({
                                        req,
                                        res,
                                        userId,
                                        accessTokenPayload,
                                        sessionData,
                                    });
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

        try {
            await Session.createJWT({});
            throw new Error("createJWT succeeded when it should have failed");
        } catch (e) {
            if (
                e.message !==
                "createJWT cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
            ) {
                throw e;
            }
        }

        try {
            await Session.getJWKS();
            throw new Error("getJWKS succeeded when it should have failed");
        } catch (e) {
            if (
                e.message !==
                "getJWKS cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
            ) {
                throw e;
            }
        }
    });

    it("Test that JWT functions work if the jwt feature is enabled", async function () {
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
                    getTokenTransferMethod: () => "cookie",
                    jwt: { enable: true },
                    override: {
                        functions: function (oi) {
                            return {
                                ...oi,
                                createNewSession: async function ({
                                    req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                                }) {
                                    accessTokenPayload = {
                                        ...accessTokenPayload,
                                        customKey: "customValue",
                                        customKey2: "customValue2",
                                    };

                                    return await oi.createNewSession({
                                        req,
                                        res,
                                        userId,
                                        accessTokenPayload,
                                        sessionData,
                                    });
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

        await Session.createJWT({});
        await Session.getJWKS();
    });
});
