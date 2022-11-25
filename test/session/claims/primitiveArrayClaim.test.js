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

            const claimWithInfiniteMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: Number.POSITIVE_INFINITY,
            });

            const claimWithDefaultMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: 600,
            });

            it("should not validate empty payload", async () => {
                const res = await claimWithInfiniteMaxAge.validators.includes(includedItem, 600).validate({}, {});
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators
                    .includes(notIncludedItem, 600)
                    .validate(payload, {});
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators.includes(includedItem, 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators.includes(includedItem, 600).validate(payload, {});
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

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators.includes(includedItem).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(claimWithInfiniteMaxAge.validators.includes(notIncludedItem, 600).shouldRefetch({}), true);
            });

            it("should not refetch if value is set", async () => {
                const payload = await claimWithInfiniteMaxAge.build("userId");

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includes(notIncludedItem, 600).shouldRefetch(payload),
                    false
                );
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includes(notIncludedItem, 600).shouldRefetch(payload),
                    true
                );
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includes(notIncludedItem).shouldRefetch(payload),
                    false
                );
            });

            it("should not validate values older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithDefaultMaxAge.validators.includes(includedItem).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values with default defaultMaxAge", async () => {
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

            it("should refetch if value is older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claimWithDefaultMaxAge.validators.includes(notIncludedItem).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is overrides to infinite", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithDefaultMaxAge.validators
                        .includes(notIncludedItem, Number.POSITIVE_INFINITY)
                        .shouldRefetch(payload),
                    false
                );
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

            const claimWithInifiniteDefaultMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: Number.POSITIVE_INFINITY,
            });

            const claimWithDefaultMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: 600,
            });

            it("should not validate empty payload", async () => {
                const res = await claimWithInifiniteDefaultMaxAge.validators
                    .excludes(notIncludedItem, 600)
                    .validate({}, {});
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
                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");
                const res = await claimWithInifiniteDefaultMaxAge.validators
                    .excludes(includedItem, 600)
                    .validate(payload, {});
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
                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");
                const res = await claimWithInifiniteDefaultMaxAge.validators
                    .excludes(notIncludedItem, 600)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInifiniteDefaultMaxAge.validators
                    .excludes(notIncludedItem, 600)
                    .validate(payload, {});
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

                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInifiniteDefaultMaxAge.validators
                    .excludes(notIncludedItem)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(
                    claimWithInifiniteDefaultMaxAge.validators.excludes(includedItem, 600).shouldRefetch({}),
                    true
                );
            });

            it("should not refetch if value is set", async () => {
                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");

                assert.equal(
                    claimWithInifiniteDefaultMaxAge.validators.excludes(includedItem, 600).shouldRefetch(payload),
                    false
                );
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInifiniteDefaultMaxAge.validators.excludes(includedItem, 600).shouldRefetch(payload),
                    true
                );
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInifiniteDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInifiniteDefaultMaxAge.validators.excludes(includedItem).shouldRefetch(payload),
                    false
                );
            });

            it("should not validate values older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithDefaultMaxAge.validators.excludes(includedItem).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values with default defaultMaxAge", async () => {
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

            it("should refetch if value is older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claimWithDefaultMaxAge.validators.excludes(notIncludedItem).shouldRefetch(payload), true);
            });

            it("should not refetch if maxAge is overrides to infinite", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithDefaultMaxAge.validators
                        .excludes(notIncludedItem, Number.POSITIVE_INFINITY)
                        .shouldRefetch(payload),
                    false
                );
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

            const claimWithInfiniteMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: Number.POSITIVE_INFINITY,
            });

            const claimWithDefaultMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: 600,
            });

            it("should not validate empty payload", async () => {
                const res = await claimWithInfiniteMaxAge.validators.includesAll([includedItem], 600).validate({}, {});
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators
                    .includesAll([includedItem], 600)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should validate with requirement array", async () => {
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators.includesAll([], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators
                    .includesAll([includedItem], 600)
                    .validate(payload, {});
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

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators.includesAll([includedItem]).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(
                    claimWithInfiniteMaxAge.validators.includesAll([notIncludedItem], 600).shouldRefetch({}),
                    true
                );
            });

            it("should not refetch if value is set", async () => {
                const payload = await claimWithInfiniteMaxAge.build("userId");

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includesAll([notIncludedItem], 600).shouldRefetch(payload),
                    false
                );
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includesAll([notIncludedItem], 600).shouldRefetch(payload),
                    true
                );
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.includesAll([notIncludedItem]).shouldRefetch(payload),
                    false
                );
            });

            it("should not validate values older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithDefaultMaxAge.validators
                    .includesAll([notIncludedItem])
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should not refetch old values with default defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claim.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(claim.validators.includesAll([notIncludedItem]).shouldRefetch(payload), false);
            });

            it("should not refetch if maxAge is overrides to infinite", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithDefaultMaxAge.validators
                        .includesAll([notIncludedItem], Number.POSITIVE_INFINITY)
                        .shouldRefetch(payload),
                    false
                );
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

            const claimWithInfiniteMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: Number.POSITIVE_INFINITY,
            });

            const claimWithDefaultMaxAge = new PrimitiveArrayClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: 600,
            });

            it("should not validate empty payload", async () => {
                const res = await claimWithInfiniteMaxAge.validators
                    .excludesAll([notIncludedItem], 600)
                    .validate({}, {});
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators
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
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators
                    .excludesAll([notIncludedItem], 600)
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should validate with empty array", async () => {
                const payload = await claimWithInfiniteMaxAge.build("userId");
                const res = await claimWithInfiniteMaxAge.validators.excludesAll([], 600).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should not validate old values", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators
                    .excludesAll([notIncludedItem], 600)
                    .validate(payload, {});
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

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithInfiniteMaxAge.validators
                    .excludesAll([notIncludedItem])
                    .validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: true,
                });
            });

            it("should refetch if value is not set", () => {
                assert.equal(
                    claimWithInfiniteMaxAge.validators.excludesAll([includedItem], 600).shouldRefetch({}),
                    true
                );
            });

            it("should not refetch if value is set", async () => {
                const payload = await claimWithInfiniteMaxAge.build("userId");

                assert.equal(
                    claimWithInfiniteMaxAge.validators.excludesAll([includedItem], 600).shouldRefetch(payload),
                    false
                );
            });

            it("should refetch if value is old", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.excludesAll([includedItem], 600).shouldRefetch(payload),
                    true
                );
            });

            it("should not refetch if maxAge is undefined", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithInfiniteMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithInfiniteMaxAge.validators.excludesAll([includedItem]).shouldRefetch(payload),
                    false
                );
            });

            it("should not validate values older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                const res = await claimWithDefaultMaxAge.validators.excludesAll([includedItem]).validate(payload, {});
                assert.deepStrictEqual(res, {
                    isValid: false,
                    reason: {
                        ageInSeconds: 604800,
                        maxAgeInSeconds: 600,
                        message: "expired",
                    },
                });
            });

            it("should validate old values with default defaultMaxAge", async () => {
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

            it("should refetch if value is older than defaultMaxAge", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithDefaultMaxAge.validators.excludesAll([includedItem]).shouldRefetch(payload),
                    true
                );
            });

            it("should not refetch if maxAge is overrides to infinite", async () => {
                const now = Date.now();
                const clock = sinon.useFakeTimers(now);

                const payload = await claimWithDefaultMaxAge.build("userId");

                // advance clock by one week
                clock.tick(6.048e8);

                assert.equal(
                    claimWithDefaultMaxAge.validators
                        .excludesAll([includedItem], Number.POSITIVE_INFINITY)
                        .shouldRefetch(payload),
                    false
                );
            });
        });
    });
});
