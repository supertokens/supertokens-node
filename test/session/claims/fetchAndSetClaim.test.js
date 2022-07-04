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
const { printPath } = require("../../utils");
const assert = require("assert");
const { default: SessionClass } = require("../../../lib/build/recipe/session/sessionClass");
const sinon = require("sinon");
const { TrueClaim, UndefinedClaim } = require("./testClaims");

describe(`sessionClaims/fetchAndSetClaim: ${printPath("[test/session/claims/fetchAndSetClaim.test.js]")}`, function () {
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

        it("should update if claim fetchValue returns undefined", async () => {
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
    });
});
