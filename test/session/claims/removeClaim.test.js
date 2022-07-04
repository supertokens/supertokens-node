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
const { printPath, startST, killAllST, setupST, cleanST } = require("../../utils");
const assert = require("assert");
const SuperTokens = require("../../..");
const Session = require("../../../recipe/session");
const { default: SessionClass } = require("../../../lib/build/recipe/session/sessionClass");
const sinon = require("sinon");
const { TrueClaim } = require("./testClaims");
const { ProcessState } = require("../../../lib/build/processState");
const { Querier } = require("../../../lib/build/querier");
const { maxVersion } = require("../../../lib/build/utils");

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

describe(`sessionClaims/removeClaim: ${printPath("[test/session/claims/removeClaim.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("SessionClass.removeClaim", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("should attempt to set claim to null", async () => {
            const session = new SessionClass({}, "testToken", "testHandle", "testUserId", {}, {});
            sinon.useFakeTimers();
            const mock = sinon.mock(session).expects("mergeIntoAccessTokenPayload").once().withArgs({
                "st-true": null,
            });
            await session.removeClaim(TrueClaim);
            mock.verify();
        });

        it("should clear previously set claim", async function () {
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

            await res.removeClaim(TrueClaim);

            const payloadAfter = res.getAccessTokenPayload();
            assert.equal(Object.keys(payloadAfter).length, 0);
        });
    });
});
