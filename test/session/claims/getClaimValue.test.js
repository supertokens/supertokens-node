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
const sinon = require("sinon");
const { TrueClaim } = require("./testClaims");
const { ProcessState } = require("../../../lib/build/processState");

describe(`sessionClaims/getClaimValue: ${printPath("[test/session/claims/getClaimValue.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("SessionClass.getClaimValue", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("should get the right value", async function () {
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
            const session = await Session.createNewSession(
                mockRequest(),
                response,
                "public",
                SuperTokens.convertToRecipeUserId("someId")
            );

            const res = await session.getClaimValue(TrueClaim);
            assert.equal(res, true);
        });

        it("should get the right value using session handle", async function () {
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
            const session = await Session.createNewSession(
                mockRequest(),
                response,
                "public",
                SuperTokens.convertToRecipeUserId("someId")
            );

            const res = await Session.getClaimValue(session.getHandle(), TrueClaim);
            assert.deepStrictEqual(res, {
                status: "OK",
                value: true,
            });
        });

        it("should work for not existing handle", async function () {
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

            assert.deepStrictEqual(await Session.getClaimValue("asfd", TrueClaim), {
                status: "SESSION_DOES_NOT_EXIST_ERROR",
            });
        });
    });
});
