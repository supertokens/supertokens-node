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
const { default: SessionClass } = require("../../../lib/build/recipe/session/sessionClass");
const sinon = require("sinon");
const { TrueClaim, UndefinedClaim } = require("./testClaims");
const SuperTokens = require("../../..");
const Session = require("../../../recipe/session");
const { ProcessState } = require("../../../lib/build/processState");

describe(`sessionClaims/fetchAndSetClaim: ${printPath("[test/session/claims/fetchAndSetClaim.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("SessionClass.fetchAndSetClaim", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("should not change if claim fetchValue returns undefined", async () => {
            const session = new SessionClass({}, "testToken", "testHandle", "testUserId", {}, {});

            const mock = sinon.mock(session).expects("mergeIntoAccessTokenPayload").once().withArgs({});
            await session.fetchAndSetClaim(UndefinedClaim);
            mock.verify();
        });

        it("should update if claim fetchValue returns value", async () => {
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
            await session.fetchAndSetClaim(TrueClaim);
            mock.verify();
        });

        it("should update using a handle if claim fetchValue returns a value", async () => {
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

            const response = mockResponse();
            const res = await Session.createNewSession(
                mockRequest(),
                response,
                "public",
                SuperTokens.convertToRecipeUserId("someId")
            );

            await Session.fetchAndSetClaim(res.getHandle(), TrueClaim);

            const payload = (await Session.getSessionInformation(res.getHandle())).customClaimsInAccessTokenPayload;
            assert.equal(Object.keys(payload).length, 2);
            assert.ok(payload["st-true"]);
            assert.equal(payload["st-true"].v, true);
            assert(payload["st-true"].t > Date.now() - 1000);
        });
    });
});
