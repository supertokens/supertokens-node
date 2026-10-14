/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath } = require("../utils");
const assert = require("assert");
const { AWSRequest } = require("../../lib/build/framework/awsLambda/framework");
const NormalisedURLPath = require("../../lib/build/normalisedURLPath").default;

function v2Event(path, queryStringParameters) {
    return {
        version: "2.0",
        headers: {},
        requestContext: {
            http: { path, method: "GET" },
            stage: "prod",
        },
        queryStringParameters,
    };
}

function v1Event(path, queryStringParameters) {
    return {
        path,
        httpMethod: "GET",
        headers: {},
        requestContext: { path: "/prod" + path, stage: "prod" },
        queryStringParameters,
    };
}

function getOriginalURL(event) {
    return new AWSRequest(event).getOriginalURL();
}

function getRoutedPath(event) {
    return new NormalisedURLPath(getOriginalURL(event)).getAsStringDangerous();
}

const query = { a: "1" };

describe(`AWSRequest.getOriginalURL: ${printPath("[test/framework/awsLambda.requestPath.test.js]")}`, function () {
    describe("payload v2 with a stage", function () {
        for (const path of ["/prodXYZ/auth/signin", "/prod-anything/auth/signin", "/prod@evil.test/auth/signin"]) {
            it(`only strips the stage as a whole path segment for ${path} with query params`, function () {
                const event = v2Event(path, query);
                assert.notStrictEqual(getRoutedPath(event), "/auth/signin");
                assert.strictEqual(getRoutedPath(event), new NormalisedURLPath(path).getAsStringDangerous());
                assert(getOriginalURL(event).endsWith("?a=1"));
            });
        }

        it("keeps the full path for /prodXYZ/auth/signin with query params", function () {
            assert.strictEqual(getOriginalURL(v2Event("/prodXYZ/auth/signin", query)), "/prodXYZ/auth/signin?a=1");
        });

        it("only strips the stage as a whole path segment for /prod@evil.test/auth/signin without query params", function () {
            assert.notStrictEqual(getRoutedPath(v2Event("/prod@evil.test/auth/signin")), "/auth/signin");
        });

        it("only strips the stage as a whole path segment for /prodXYZ/auth/signin without query params", function () {
            assert.strictEqual(getRoutedPath(v2Event("/prodXYZ/auth/signin")), "/prodXYZ/auth/signin");
        });

        it("strips the stage from /prod/auth/signin", function () {
            assert.strictEqual(getOriginalURL(v2Event("/prod/auth/signin")), "/auth/signin");
            assert.strictEqual(getRoutedPath(v2Event("/prod/auth/signin")), "/auth/signin");
            assert.strictEqual(getOriginalURL(v2Event("/prod/auth/signin", query)), "/auth/signin?a=1");
            assert.strictEqual(getRoutedPath(v2Event("/prod/auth/signin", query)), "/auth/signin");
        });

        it("resolves /prod to the root path", function () {
            const rootPath = new NormalisedURLPath("/").getAsStringDangerous();
            assert.strictEqual(getRoutedPath(v2Event("/prod")), rootPath);
            assert.strictEqual(getRoutedPath(v2Event("/prod", query)), rootPath);
            assert.strictEqual(getRoutedPath(v2Event("/prod/")), rootPath);
        });

        it("encodes query params", function () {
            assert.strictEqual(
                getOriginalURL(v2Event("/prod/auth/signin", { email: "a@b.com", q: "x y&z" })),
                "/auth/signin?email=a%40b.com&q=x+y%26z"
            );
        });

        for (const path of ["/other/auth/signin", "/pro/auth/signin"]) {
            it(`does not change ${path}`, function () {
                assert.strictEqual(getOriginalURL(v2Event(path)), path);
                assert.strictEqual(getRoutedPath(v2Event(path)), path);
                assert.strictEqual(getOriginalURL(v2Event(path, query)), path + "?a=1");
                assert.strictEqual(getRoutedPath(v2Event(path, query)), path);
            });
        }

        it("does not treat a leading // after the stage as a host", function () {
            assert.strictEqual(getRoutedPath(v2Event("/prod//evil.test/auth/signin")), "//evil.test/auth/signin");
            assert.strictEqual(
                getRoutedPath(v2Event("/prod//evil.test/auth/signin", query)),
                "//evil.test/auth/signin"
            );
        });

        for (const path of [
            "/prod/auth/signin?x=1",
            "/prod/auth/signin#x",
            "/prod/auth/sign in",
            "/prod/auth/../signin",
        ]) {
            it(`routes ${path} the same with and without query params`, function () {
                assert.strictEqual(getRoutedPath(v2Event(path, query)), getRoutedPath(v2Event(path)));
                assert.strictEqual(getOriginalURL(v2Event(path, query)), getOriginalURL(v2Event(path)) + "?a=1");
            });
        }
    });

    describe("payload v1", function () {
        for (const path of ["/prodXYZ/auth/signin", "/auth/signin", "/prod/auth/signin"]) {
            it(`returns the path as is for ${path}`, function () {
                assert.strictEqual(getOriginalURL(v1Event(path)), path);
                assert.strictEqual(getOriginalURL(v1Event(path, query)), path);
            });
        }
    });
});
