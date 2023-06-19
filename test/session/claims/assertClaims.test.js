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
const { StubClaim } = require("./testClaims");
const { default: getRecipeInterface } = require("../../../lib/build/recipe/session/recipeImplementation");

const helpers = { getRecipeImpl: () => getRecipeInterface({ getAllCoreUrlsForPath: () => [] }, {}) };

describe(`sessionClaims/assertClaims: ${printPath("[test/session/claims/assertClaims.test.js]")}`, function () {
    describe("SessionClass.assertClaims", () => {
        afterEach(() => {
            sinon.restore();
        });
        it("should not throw for empty array", async () => {
            const session = new SessionClass(helpers, "testToken", "testHandle", "testUserId", {}, {});
            const mock = sinon.mock(session).expects("mergeIntoAccessTokenPayload").never();

            await session.assertClaims([]);
            mock.verify();
        });

        it("should call validate with the same payload object", async () => {
            const payload = {};
            const session = new SessionClass(
                helpers,
                "testToken",
                "testToken",
                undefined,
                undefined,
                "testHandle",
                "testUserId",
                payload,
                {}
            );
            const mock = sinon.mock(session).expects("mergeIntoAccessTokenPayload").never();
            const claim = new StubClaim({ key: "st-c1", validateRes: { isValid: true } });

            await session.assertClaims([claim.validators.stub]);
            mock.verify();
            assert.equal(claim.validators.stub.validate.callCount, 1);
            assert(claim.validators.stub.validate.calledWith(payload));
        });
    });
});
