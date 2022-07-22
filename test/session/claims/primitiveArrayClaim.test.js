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
const sinon = require("sinon");
const { PrimitiveArrayClaim } = require("../../../lib/build/recipe/session/claimBaseClasses/primitiveArrayClaim");

describe(`sessionClaims/primitiveArrayClaim: ${printPath(
    "[test/session/claims/primitiveArrayClaim.test.js]"
)}`, function () {
    describe("PrimitiveArrayClaim", () => {
        afterEach(() => {
            sinon.restore();
        });

        describe("fetchAndSetClaim", () => {
            it("should build the right payload", async () => {
                const val = ["a"];
                const fetchValue = sinon.stub().returns(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const ctx = {};
                const res = await claim.build("userId", ctx);
                assert.deepStrictEqual(res, {
                    asdf: {
                        t: now,
                        v: val,
                    },
                });
            });

            it("should build the right payload w/ async fetch", async () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const ctx = {};
                const res = await claim.build("userId", ctx);
                assert.deepStrictEqual(res, {
                    asdf: {
                        t: now,
                        v: val,
                    },
                });
            });

            it("should build the right payload matching addToPayload_internal", async () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const ctx = {};
                const res = await claim.build("userId", ctx);
                assert.deepStrictEqual(res, claim.addToPayload_internal({}, val));
            });

            it("should call fetchValue with the right params", async () => {
                const fetchValue = sinon.stub().returns(true);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const userId = "userId";

                const ctx = {};
                await claim.build(userId, ctx);
                assert.strictEqual(fetchValue.callCount, 1);
                assert.strictEqual(fetchValue.firstCall.args[0], userId);
                assert.strictEqual(fetchValue.firstCall.args[1], ctx);
            });

            it("should leave payload empty if fetchValue returns undefined", async () => {
                const fetchValue = sinon.stub().returns(undefined);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });

                const ctx = {};

                const res = await claim.build("userId", ctx);
                assert.deepStrictEqual(res, {});
            });
        });

        describe("getValueFromPayload", () => {
            it("should return undefined for empty payload", () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });

                assert.strictEqual(claim.getValueFromPayload({}), undefined);
            });

            it("should return value set by fetchAndSetClaim", async () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.build("userId");

                assert.strictEqual(claim.getValueFromPayload(payload), val);
            });

            it("should return value set by addToPayload_internal", async () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.addToPayload_internal({}, val);
                assert.strictEqual(claim.getValueFromPayload(payload), val);
            });
        });

        describe("getLastRefetchTime", () => {
            it("should return undefined for empty payload", () => {
                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });

                assert.strictEqual(claim.getLastRefetchTime({}), undefined);
            });

            it("should return time matching the fetchAndSetClaim call", async () => {
                const now = Date.now();
                sinon.useFakeTimers(now);

                const val = ["a"];
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveArrayClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.build("userId");

                assert.strictEqual(claim.getLastRefetchTime(payload), now);
            });
        });

        describe("validators.includes", () => {
            const includedItem = "a";
            const notIncludedItem = "b";
            const val = [includedItem];
            const claim = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
            });

            it("should not validate empty payload", async () => {
                const res = await claim.validators.includes(includedItem, 600).validate({}, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToInclude: includedItem,
                        actualValue: undefined,
                        message: "value does not exist",
                    },
                });
            });

            it("should not validate mismatching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.includes(notIncludedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToInclude: notIncludedItem,
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should validate matching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.includes(includedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.includes(includedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.includes(includedItem).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claim.validators.includes(notIncludedItem, 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claim.build("userId");

                assert.equal(claim.validators.includes(notIncludedItem, 600).shouldRefetch(payload), false);
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.includes(notIncludedItem, 600).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.includes(notIncludedItem).shouldRefetch(payload), false);
            });
        });

        describe("validators.excludes", () => {
            const includedItem = "a";
            const notIncludedItem = "b";
            const val = [includedItem];
            const claim = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
            });

            it("should not validate empty payload", async () => {
                const res = await claim.validators.excludes(notIncludedItem, 600).validate({}, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToNotInclude: notIncludedItem,
                        actualValue: undefined,
                        message: "value does not exist",
                    },
                });
            });

            it("should not validate mismatching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.excludes(includedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToNotInclude: includedItem,
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should validate matching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.excludes(notIncludedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.excludes(notIncludedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.excludes(notIncludedItem).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claim.validators.excludes(includedItem, 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claim.build("userId");

                assert.equal(claim.validators.excludes(includedItem, 600).shouldRefetch(payload), false);
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.excludes(includedItem, 600).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.excludes(includedItem).shouldRefetch(payload), false);
            });
        });

        describe("validators.includesAll", () => {
            const includedItem = "a";
            const notIncludedItem = "b";
            const val = [includedItem];
            const claim = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
            });

            it("should not validate empty payload", async () => {
                const res = await claim.validators.includesAll([includedItem], 600).validate({}, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToInclude: [includedItem],
                        actualValue: undefined,
                        message: "value does not exist",
                    },
                });
            });

            it("should not validate mismatching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators
                    .includesAll([includedItem, notIncludedItem], 600)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToInclude: [includedItem, notIncludedItem],
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should validate matching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.includesAll([includedItem], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should validate with requirement array", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.includesAll([], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.includesAll([includedItem], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.includesAll([includedItem]).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claim.validators.includesAll([notIncludedItem], 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claim.build("userId");

                assert.equal(claim.validators.includesAll([notIncludedItem], 600).shouldRefetch(payload), false);
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.includesAll([notIncludedItem], 600).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.includesAll([notIncludedItem]).shouldRefetch(payload), false);
            });
        });

        describe("validators.excludesAll", () => {
            const includedItem = "a";
            const notIncludedItem = "b";
            const val = [includedItem];
            const claim = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
            });

            it("should not validate empty payload", async () => {
                const res = await claim.validators.excludesAll([notIncludedItem], 600).validate({}, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToNotInclude: [notIncludedItem],
                        actualValue: undefined,
                        message: "value does not exist",
                    },
                });
            });

            it("should not validate mismatching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators
                    .excludesAll([includedItem, notIncludedItem], 600)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedToNotInclude: [includedItem, notIncludedItem],
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should validate matching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.excludesAll([notIncludedItem], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should validate with empty array", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.excludesAll([], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.excludesAll([notIncludedItem], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.excludesAll([notIncludedItem]).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claim.validators.excludesAll([includedItem], 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claim.build("userId");

                assert.equal(claim.validators.excludesAll([includedItem], 600).shouldRefetch(payload), false);
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.excludesAll([includedItem], 600).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.excludesAll([includedItem]).shouldRefetch(payload), false);
            });
        });

        describe("validators.strictEquals", () => {
            const itemA = "a";
            const itemB = "b";
            const val = [itemA, itemB];
            const claim = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
            });

            it("should not validate empty payload", async () => {
                const res = await claim.validators.strictEquals(val, 600).validate({}, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedValue: val,
                        actualValue: undefined,
                        message: "value does not exist",
                    },
                });
            });

            it("should not validate mismatching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.strictEquals([itemA, itemA], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedValue: [itemA, itemA],
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should not validate mismatching payload with different length", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.strictEquals([itemA], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedValue: [itemA],
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should not validate payload with different value order", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.strictEquals([itemB, itemA], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        expectedValue: [itemB, itemA],
                        actualValue: val,
                        message: "wrong value",
                    },
                });
            });

            it("should validate matching payload", async () => {
                const payload = await claim.build("userId");
                const res = await claim.validators.strictEquals([itemA, itemB], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.strictEquals([itemA], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claim.validators.strictEquals([itemA, itemB]).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claim.validators.strictEquals([itemB], 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claim.build("userId");

                assert.equal(claim.validators.strictEquals([itemB], 600).shouldRefetch(payload), false);
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.strictEquals([itemB], 600).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.strictEquals([itemB]).shouldRefetch(payload), false);
            });
        });
    });
});
