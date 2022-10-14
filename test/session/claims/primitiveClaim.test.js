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
const { PrimitiveClaim } = require("../../../recipe/session/claims");

describe(`sessionClaims/primitiveClaim: ${printPath("[test/session/claims/primitiveClaim.test.js]")}`, function () {
    describe("PrimitiveClaim", () => {
        afterEach(() => {
            sinon.restore();
        });

        describe("fetchAndSetClaim", () => {
            it("should build the right payload", async () => {
                const val = { a: 1 };
                const fetchValue = sinon.stub().returns(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveClaim({
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
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveClaim({
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
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const now = Date.now();
                sinon.useFakeTimers(now);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });
                const ctx = {};
                const res = await claim.build("userId", ctx);
                assert.deepStrictEqual(res, claim.addToPayload_internal({}, val));
            });

            it("should call fetchValue with the right params", async () => {
                const fetchValue = sinon.stub().returns(true);
                const claim = new PrimitiveClaim({
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
                const claim = new PrimitiveClaim({
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
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });

                assert.strictEqual(claim.getValueFromPayload({}), undefined);
            });

            it("should return value set by fetchAndSetClaim", async () => {
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.build("userId");

                assert.strictEqual(claim.getValueFromPayload(payload), val);
            });

            it("should return value set by addToPayload_internal", async () => {
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.addToPayload_internal({}, val);
                assert.strictEqual(claim.getValueFromPayload(payload), val);
            });
        });

        describe("getLastRefetchTime", () => {
            it("should return undefined for empty payload", () => {
                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });

                assert.strictEqual(claim.getLastRefetchTime({}), undefined);
            });

            it("should return time matching the fetchAndSetClaim call", async () => {
                const now = Date.now();
                sinon.useFakeTimers(now);

                const val = { a: 1 };
                const fetchValue = sinon.stub().resolves(val);
                const claim = new PrimitiveClaim({
                    key: "asdf",
                    fetchValue,
                });
                const payload = await claim.build("userId");

                assert.strictEqual(claim.getLastRefetchTime(payload), now);
            });
        });

        describe("validators.hasValue", () => {
            const val = { a: 1 };
            const val2 = { b: 1 };
            const claim = new PrimitiveClaim({
                key: "asdf",
                fetchValue: () => val,
            });
            const claimWithInifiniteMaxAge = new PrimitiveClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: Number.POSITIVE_INFINITY,
            });
            const claimWithDefaultMaxAge = new PrimitiveClaim({
                key: "asdf",
                fetchValue: () => val,
                defaultMaxAgeInSeconds: 600,
            });

            describe("with infinite defaultMaxAgeInSeconds", () => {
                it("should not validate empty payload", async () => {
                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val).validate({}, {});
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
                    const payload = await claimWithInifiniteMaxAge.build("userId");
                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val2).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: false,
                        reason: {
                            expectedValue: val2,
                            actualValue: val,
                            message: "wrong value",
                        },
                    });
                });

                it("should validate matching payload", async () => {
                    const payload = await claimWithInifiniteMaxAge.build("userId");
                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should validate old values as well", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithInifiniteMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should refetch if value is not set", async () => {
                    assert.equal(await claimWithInifiniteMaxAge.validators.hasValue(val2).shouldRefetch({}), true);
                });

                it("should not refetch if value is set", async () => {
                    const payload = await claimWithInifiniteMaxAge.build("userId");

                    assert.equal(
                        await claimWithInifiniteMaxAge.validators.hasValue(val2).shouldRefetch(payload),
                        false
                    );
                });
            });

            describe("with set defaultMaxAgeInSeconds", () => {
                it("should validate matching payload", async () => {
                    const payload = await claimWithDefaultMaxAge.build("userId");
                    const res = await claimWithDefaultMaxAge.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should not validate old values", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithDefaultMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    const res = await claimWithDefaultMaxAge.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: false,
                        reason: {
                            ageInSeconds: 604800,
                            maxAgeInSeconds: 600,
                            message: "expired",
                        },
                    });
                });

                it("should refetch if value is not set", () => {
                    assert.equal(claimWithDefaultMaxAge.validators.hasValue(val2).shouldRefetch({}), true);
                });

                it("should not refetch if value is set", async () => {
                    const payload = await claimWithDefaultMaxAge.build("userId");

                    assert.equal(claimWithDefaultMaxAge.validators.hasValue(val2).shouldRefetch(payload), false);
                });

                it("should refetch if value is old", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithDefaultMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    assert.equal(claimWithDefaultMaxAge.validators.hasValue(val2).shouldRefetch(payload), true);
                });

                it("should not refetch with an overridden maxAgeInSeconds", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithDefaultMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    assert.equal(
                        claimWithDefaultMaxAge.validators
                            .hasValue(val2, Number.POSITIVE_INFINITY)
                            .shouldRefetch(payload),
                        false
                    );
                });
            });

            describe("with default defaultMaxAgeInSeconds", () => {
                it("should validate matching payload", async () => {
                    const payload = await claim.build("userId");
                    const res = await claim.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should validate old values", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claim.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    const res = await claim.validators.hasValue(val).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should refetch if value is not set", () => {
                    assert.equal(claim.validators.hasValue(val2).shouldRefetch({}), true);
                });

                it("should not refetch if value is set", async () => {
                    const payload = await claim.build("userId");

                    assert.equal(claim.validators.hasValue(val2).shouldRefetch(payload), false);
                });

                it("should refetch if value is old", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claim.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    assert.equal(claim.validators.hasValue(val2).shouldRefetch(payload), false);
                });

                it("should not refetch with an overridden maxAgeInSeconds", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claim.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    assert.equal(
                        claim.validators.hasValue(val2, Number.POSITIVE_INFINITY).shouldRefetch(payload),
                        false
                    );
                });
            });

            describe("with maxAgeInSeconds", () => {
                it("should validate matching payload", async () => {
                    const payload = await claimWithInifiniteMaxAge.build("userId");
                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val, 600).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: true,
                    });
                });

                it("should not validate old values", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithInifiniteMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    const res = await claimWithInifiniteMaxAge.validators.hasValue(val, 600).validate(payload, {});
                    assert.deepStrictEqual(res, {
                        isValid: false,
                        reason: {
                            ageInSeconds: 604800,
                            maxAgeInSeconds: 600,
                            message: "expired",
                        },
                    });
                });

                it("should refetch if value is not set", () => {
                    assert.equal(claimWithInifiniteMaxAge.validators.hasValue(val2, 600).shouldRefetch({}), true);
                });

                it("should not refetch if value is set", async () => {
                    const payload = await claimWithInifiniteMaxAge.build("userId");

                    assert.equal(claimWithInifiniteMaxAge.validators.hasValue(val2, 600).shouldRefetch(payload), false);
                });

                it("should refetch if value is old", async () => {
                    const now = Date.now();
                    const clock = sinon.useFakeTimers(now);

                    const payload = await claimWithInifiniteMaxAge.build("userId");

                    // advance clock by one week
                    clock.tick(6.048e8);

                    assert.equal(claimWithInifiniteMaxAge.validators.hasValue(val2, 600).shouldRefetch(payload), true);
                });
            });
        });
    });
});
