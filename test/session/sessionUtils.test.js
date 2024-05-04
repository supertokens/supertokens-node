/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
const assert = require("assert");
const { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");

describe("normaliseSessionScopeOrThrowError", () => {
    it("should throw an error when scope is an empty string", () => {
        assert.throws(() => normaliseSessionScopeOrThrowError(""), {
            message: "Please provide a valid sessionScope",
        });
    });

    it("should retain the leading dot when original scope starts with a dot", () => {
        const result = normaliseSessionScopeOrThrowError(".example.com");
        assert.strictEqual(result, ".example.com");
    });

    it("should return the normalised scope without a leading dot", () => {
        const result = normaliseSessionScopeOrThrowError("example.com");
        assert.strictEqual(result, "example.com");
    });

    it("should normalise scope with HTTP prefix", () => {
        const result = normaliseSessionScopeOrThrowError("http://example.com");
        assert.strictEqual(result, "example.com");
    });

    it("should normalise scope with HTTPS prefix", () => {
        const result = normaliseSessionScopeOrThrowError("https://example.com");
        assert.strictEqual(result, "example.com");
    });

    it("should return the IP address as-is", () => {
        const result = normaliseSessionScopeOrThrowError("192.168.1.1");
        assert.strictEqual(result, "192.168.1.1");
    });

    it('should return "localhost" if the scope is localhost', () => {
        const result = normaliseSessionScopeOrThrowError("localhost");
        assert.strictEqual(result, "localhost");
    });

    it("should trim leading and trailing whitespace", () => {
        const result = normaliseSessionScopeOrThrowError("  example.com  ");
        assert.strictEqual(result, "example.com");
    });

    it("should return correct scope for subdomains", () => {
        assert.strictEqual(normaliseSessionScopeOrThrowError("sub.example.com"), "sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError("http://sub.example.com"), "sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError("https://sub.example.com"), "sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError(".sub.example.com"), ".sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError("a.sub.example.com"), "a.sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError("http://a.sub.example.com"), "a.sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError("https://a.sub.example.com"), "a.sub.example.com");
        assert.strictEqual(normaliseSessionScopeOrThrowError(".a.sub.example.com"), ".a.sub.example.com");
    });
});
