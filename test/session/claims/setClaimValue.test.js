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
const { printPath, startST, killAllST, setupST, cleanST, mockResponse, mockRequest } = require("../../utils");
const assert = require("assert");
const SuperTokens = require("../../..");
const Session = require("../../../recipe/session");
const { default: SessionClass } = require("../../../lib/build/recipe/session/sessionClass");
const sinon = require("sinon");
const { TrueClaim } = require("./testClaims");
const { ProcessState } = require("../../../lib/build/processState");

describe(`sessionClaims/setClaimValue: ${printPath("[test/session/claims/setClaimValue.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("SessionClass.setClaimValue", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("should merge the right value", async () => {
            const session = new SessionClass({}, "testToken", "testHandle", "testUserId", {}, {});
            sinon.useFakeTimers();
            const mock = sinon
                .mock(session)
                .expects("mergeIntoAccessTokenPayload")
                .once()
                .withArgs({
                    "st-true": {
                        t: 0,
                        v: true,
                    },
                });
            await session.setClaimValue(TrueClaim, true);
            mock.verify();
        });

        it("should overwrite claim value", async function () {
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

            const response = mockResponse();
            const res = await Session.createNewSession(
                mockRequest(),
                response,
                "public",
                SuperTokens.convertToRecipeUserId("someId")
            );

            const payload = res.getAccessTokenPayload();
            assert.equal(Object.keys(payload).length, 11);
            assert.ok(payload["st-true"]);
            assert.equal(payload["st-true"].v, true);
            assert(payload["st-true"].t > Date.now() - 2000);

            await res.setClaimValue(TrueClaim, false);

            const payloadAfter = res.getAccessTokenPayload();
            assert.equal(Object.keys(payloadAfter).length, 11);
            assert.ok(payloadAfter["st-true"]);
            assert.equal(payloadAfter["st-true"].v, false);
            assert(payloadAfter["st-true"].t > payload["st-true"].t);
        });

        it("should overwrite claim value using session handle", async function () {
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

            const response = mockResponse();
            const res = await Session.createNewSession(
                mockRequest(),
                response,
                "public",
                SuperTokens.convertToRecipeUserId("someId")
            );

            const payload = res.getAccessTokenPayload();
            assert.equal(Object.keys(payload).length, 11);
            assert.ok(payload["st-true"]);
            assert.equal(payload["st-true"].v, true);
            assert(payload["st-true"].t > Date.now() - 10000);

            await Session.setClaimValue(res.getHandle(), TrueClaim, false);

            const payloadAfter = (await Session.getSessionInformation(res.getHandle()))
                .customClaimsInAccessTokenPayload;
            assert.equal(Object.keys(payloadAfter).length, 2);
            assert.ok(payloadAfter["st-true"]);
            assert.equal(payloadAfter["st-true"].v, false);
            assert(payloadAfter["st-true"].t > payload["st-true"].t);
        });

        it("should work ok for not existing handle", async function () {
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
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            const res = await Session.setClaimValue("asfd", TrueClaim, false);
            assert.equal(res, false);
        });
    });
});
