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
const assert = require("assert");
const { ProcessState } = require("../../../lib/build/processState");
const SuperTokens = require("../../../");
const Session = require("../../../recipe/session");
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");
const { TrueClaim, UndefinedClaim } = require("./testClaims");
const Sinon = require("sinon");

/**
 *
 * @returns {import("express").Response}
 */
const mockResponse = () => {
    const headers = {};
    const res = {
        getHeaders: () => headers,
        getHeader: (key) => headers[key],
        setHeader: (key, val) => (headers[key] = val),
    };
    return res;
};
describe(`session: ${printPath("[test/session/claims/onNewSessions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSession", () => {
        it("should create access token payload w/ session claims", async function () {
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
                                createNewSession: async (input) => {
                                    input.accessTokenPayload = {
                                        ...input.accessTokenPayload,
                                        ...(await TrueClaim.build(input.userId, input.userContext)),
                                    };
                                    return oI.createNewSession(input);
                                },
                            }),
                        },
                    }),
                ],
            });
            let q = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await q.getAPIVersion();

            // Only run test for >= 2.13
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return;
            }
            const response = mockResponse();
            const res = await Session.createNewSession(response, "someId");

            const payload = res.getAccessTokenPayload();
            assert.equal(Object.keys(payload).length, 1);
            assert.ok(payload["st-true"]);
            assert.equal(payload["st-true"].v, true);
            assert(payload["st-true"].t > Date.now() - 1000);
        });

        it("should create access token payload wo/ session claims with an undefined value", async function () {
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
                                createNewSession: async (input) => {
                                    input.accessTokenPayload = {
                                        ...input.accessTokenPayload,
                                        ...(await UndefinedClaim.build(
                                            input.userId,
                                            input.accessTokenPayload,
                                            input.userContext
                                        )),
                                    };
                                    return oI.createNewSession(input);
                                },
                            }),
                        },
                    }),
                ],
            });
            let q = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await q.getAPIVersion();

            // Only run test for >= 2.13
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return;
            }
            const response = mockResponse();
            const res = await Session.createNewSession(response, "someId");
            const payload = res.getAccessTokenPayload();
            assert.equal(Object.keys(payload).length, 0);
        });

        it("should merge claims and the passed access token payload obj", async function () {
            await startST();
            const payloadParam = { initial: true };
            const custom2 = { undef: undefined, nullProp: null, inner: "asdf" };
            const customClaims = {
                "user-custom": "asdf",
                "user-custom2": custom2,
                "user-custom3": null,
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
                                createNewSession: async (input) => {
                                    input.accessTokenPayload = {
                                        ...input.accessTokenPayload,
                                        ...(await TrueClaim.build(input.userId, input.userContext)),
                                        ...customClaims,
                                    };
                                    return oI.createNewSession(input);
                                },
                            }),
                        },
                    }),
                ],
            });
            let q = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await q.getAPIVersion();

            // Only run test for >= 2.13
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return;
            }
            const response = mockResponse();
            const res = await Session.createNewSession(response, "someId", payloadParam);

            // The passed object should be unchanged
            assert.equal(Object.keys(payloadParam).length, 1);

            const payload = res.getAccessTokenPayload();
            assert.equal(Object.keys(payload).length, 4);
            // We have the prop from the payload param
            assert.equal(payload["initial"], true);
            // We have the boolean claim
            assert.ok(payload["st-true"]);
            assert.equal(payload["st-true"].v, true);
            assert(payload["st-true"].t > Date.now() - 1000);
            // We have the custom claim
            // The resulting payload is different from the input: it doesn't container undefined and null values
            assert.deepEqual(payload["user-custom"], "asdf");
            assert.deepEqual(payload["user-custom2"], {
                inner: "asdf",
            });
        });
    });
});
