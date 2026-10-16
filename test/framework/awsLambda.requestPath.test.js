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

const apiId = "abc123";
const executeApiHost = { domainName: `${apiId}.execute-api.us-east-1.amazonaws.com`, apiId };
const customDomain = { domainName: "api.example.com", apiId };

function v2Event(path, queryStringParameters, { stage = "prod", host = executeApiHost } = {}) {
    return {
        version: "2.0",
        headers: {},
        requestContext: {
            ...host,
            http: { path, method: "GET" },
            stage,
        },
        queryStringParameters,
    };
}

function v1Event(path, queryStringParameters, host = executeApiHost) {
    return {
        path,
        httpMethod: "GET",
        headers: {},
        requestContext: { ...host, path: "/prod" + path, stage: "prod" },
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

function assertUnchanged(makeEvent, path) {
    assert.strictEqual(getOriginalURL(makeEvent(path)), path);
    assert.strictEqual(getRoutedPath(makeEvent(path)), new NormalisedURLPath(path).getAsStringDangerous());
    assert.strictEqual(getOriginalURL(makeEvent(path, query)), path + "?a=1");
    assert.strictEqual(getRoutedPath(makeEvent(path, query)), new NormalisedURLPath(path).getAsStringDangerous());
}

describe(`AWSRequest.getOriginalURL: ${printPath("[test/framework/awsLambda.requestPath.test.js]")}`, function () {
    // Real API Gateway events always have domainName and apiId. Without them (e.g.: hand-built or emulated events),
    // the stage is stripped whenever it is the first path segment, the same way as on the execute-api host.
    for (const { title, host } of [
        { title: "on the execute-api host", host: executeApiHost },
        { title: "without domainName and apiId", host: {} },
        { title: "without apiId", host: { domainName: customDomain.domainName } },
        { title: "without domainName", host: { apiId } },
    ]) {
        describe(`payload v2 with the prod stage ${title}`, function () {
            const v2 = (path, queryStringParameters) => v2Event(path, queryStringParameters, { host });

            for (const path of ["/prodXYZ/auth/signin", "/prod-anything/auth/signin", "/prod@evil.test/auth/signin"]) {
                it(`only strips the stage as a whole path segment for ${path} with query params`, function () {
                    const event = v2(path, query);
                    assert.notStrictEqual(getRoutedPath(event), "/auth/signin");
                    assert.strictEqual(getRoutedPath(event), new NormalisedURLPath(path).getAsStringDangerous());
                    assert(getOriginalURL(event).endsWith("?a=1"));
                });
            }

            it("keeps the full path for /prodXYZ/auth/signin with query params", function () {
                assert.strictEqual(getOriginalURL(v2("/prodXYZ/auth/signin", query)), "/prodXYZ/auth/signin?a=1");
            });

            it("only strips the stage as a whole path segment for /prod@evil.test/auth/signin without query params", function () {
                assert.notStrictEqual(getRoutedPath(v2("/prod@evil.test/auth/signin")), "/auth/signin");
                assert.strictEqual(getOriginalURL(v2("/prod@evil.test/auth/signin")), "/prod@evil.test/auth/signin");
            });

            it("only strips the stage as a whole path segment for /prodXYZ/auth/signin without query params", function () {
                assert.strictEqual(getOriginalURL(v2("/prodXYZ/auth/signin")), "/prodXYZ/auth/signin");
                assert.strictEqual(getRoutedPath(v2("/prodXYZ/auth/signin")), "/prodXYZ/auth/signin");
            });

            it("strips the stage from /prod/auth/signin", function () {
                assert.strictEqual(getOriginalURL(v2("/prod/auth/signin")), "/auth/signin");
                assert.strictEqual(getRoutedPath(v2("/prod/auth/signin")), "/auth/signin");
                assert.strictEqual(getOriginalURL(v2("/prod/auth/signin", query)), "/auth/signin?a=1");
                assert.strictEqual(getRoutedPath(v2("/prod/auth/signin", query)), "/auth/signin");
            });

            it("resolves /prod to the root path", function () {
                const rootPath = new NormalisedURLPath("/").getAsStringDangerous();
                assert.strictEqual(getOriginalURL(v2("/prod")), "/");
                assert.strictEqual(getOriginalURL(v2("/prod", query)), "/?a=1");
                assert.strictEqual(getRoutedPath(v2("/prod")), rootPath);
                assert.strictEqual(getRoutedPath(v2("/prod", query)), rootPath);
                assert.strictEqual(getRoutedPath(v2("/prod/")), rootPath);
            });

            it("encodes query params", function () {
                assert.strictEqual(
                    getOriginalURL(v2("/prod/auth/signin", { email: "a@b.com", q: "x y&z" })),
                    "/auth/signin?email=a%40b.com&q=x+y%26z"
                );
            });

            for (const path of ["/auth/signin", "/other/auth/signin", "/pro/auth/signin"]) {
                it(`does not change ${path}`, function () {
                    assertUnchanged(v2, path);
                });
            }

            it("does not treat a leading // after the stage as a host", function () {
                assert.strictEqual(getOriginalURL(v2("/prod//evil.test/auth/signin")), "//evil.test/auth/signin");
                assert.strictEqual(getRoutedPath(v2("/prod//evil.test/auth/signin")), "//evil.test/auth/signin");
                assert.strictEqual(
                    getOriginalURL(v2("/prod//evil.test/auth/signin", query)),
                    "//evil.test/auth/signin?a=1"
                );
                assert.strictEqual(getRoutedPath(v2("/prod//evil.test/auth/signin", query)), "//evil.test/auth/signin");
            });

            for (const path of [
                "/prod/auth/signin?x=1",
                "/prod/auth/signin#x",
                "/prod/auth/sign in",
                "/prod/auth/../signin",
            ]) {
                it(`routes ${path} the same with and without query params`, function () {
                    assert.strictEqual(getRoutedPath(v2(path, query)), getRoutedPath(v2(path)));
                    assert.strictEqual(getOriginalURL(v2(path, query)), getOriginalURL(v2(path)) + "?a=1");
                });
            }
        });
    }

    for (const { title, host } of [
        { title: "on the execute-api host", host: executeApiHost },
        { title: "behind a custom domain", host: customDomain },
        { title: "without domainName and apiId", host: {} },
    ]) {
        describe(`payload v2 with the $default stage ${title}`, function () {
            const v2 = (path, queryStringParameters) =>
                v2Event(path, queryStringParameters, { stage: "$default", host });

            for (const path of ["/auth/signin", "/$default/auth/signin", "/$defaultX/auth/signin", "/$default"]) {
                it(`does not change ${path}`, function () {
                    assertUnchanged(v2, path);
                });
            }
        });
    }

    describe("payload v2 with the prod stage behind a custom domain", function () {
        const v2 = (path, queryStringParameters) => v2Event(path, queryStringParameters, { host: customDomain });

        for (const path of [
            "/auth/signin",
            "/prod/auth/signin",
            "/prodXYZ/auth/signin",
            "/prod",
            "/prod//evil.test/auth/signin",
        ]) {
            it(`does not change ${path}`, function () {
                assertUnchanged(v2, path);
            });
        }
    });

    describe("payload v2 with the prod stage on the execute-api host of another API", function () {
        for (const domainName of [
            "other.execute-api.us-east-1.amazonaws.com",
            `x${apiId}.execute-api.us-east-1.amazonaws.com`,
            `${apiId}.example.com`,
        ]) {
            const v2 = (path, queryStringParameters) =>
                v2Event(path, queryStringParameters, { host: { domainName, apiId } });

            for (const path of ["/prod/auth/signin", "/prod"]) {
                it(`does not change ${path} on ${domainName}`, function () {
                    assertUnchanged(v2, path);
                });
            }
        }
    });

    describe("payload v2 with the prod stage on the execute-api host in a different case", function () {
        for (const host of [
            { domainName: executeApiHost.domainName.toUpperCase(), apiId },
            { domainName: `${apiId}.Execute-Api.us-east-1.amazonaws.com`, apiId },
            { domainName: executeApiHost.domainName, apiId: apiId.toUpperCase() },
        ]) {
            const v2 = (path, queryStringParameters) => v2Event(path, queryStringParameters, { host });

            it(`strips the stage from /prod/auth/signin on ${host.domainName} with apiId ${host.apiId}`, function () {
                assert.strictEqual(getOriginalURL(v2("/prod/auth/signin")), "/auth/signin");
                assert.strictEqual(getRoutedPath(v2("/prod/auth/signin")), "/auth/signin");
                assert.strictEqual(getOriginalURL(v2("/prod/auth/signin", query)), "/auth/signin?a=1");
                assert.strictEqual(getRoutedPath(v2("/prod/auth/signin", query)), "/auth/signin");
            });

            for (const path of ["/auth/signin", "/prodXYZ/auth/signin"]) {
                it(`does not change ${path} on ${host.domainName} with apiId ${host.apiId}`, function () {
                    assertUnchanged(v2, path);
                });
            }
        }
    });

    for (const { title, stage } of [
        { title: "an empty stage", stage: "" },
        { title: "a null stage", stage: null },
    ]) {
        for (const { title: hostTitle, host } of [
            { title: "on the execute-api host", host: executeApiHost },
            { title: "without domainName and apiId", host: {} },
        ]) {
            describe(`payload v2 with ${title} ${hostTitle}`, function () {
                const v2 = (path, queryStringParameters) => v2Event(path, queryStringParameters, { stage, host });

                for (const path of ["/auth/signin", "/null/auth/signin", "//evil.test/auth/signin", "/", "/null"]) {
                    it(`does not change ${path}`, function () {
                        assertUnchanged(v2, path);
                    });
                }
            });
        }
    }

    describe("payload v1", function () {
        for (const { title, host } of [
            { title: "on the execute-api host", host: executeApiHost },
            { title: "behind a custom domain", host: customDomain },
            { title: "without domainName and apiId", host: {} },
        ]) {
            for (const path of ["/prodXYZ/auth/signin", "/auth/signin", "/prod/auth/signin"]) {
                it(`returns the path as is for ${path} ${title}`, function () {
                    assert.strictEqual(getOriginalURL(v1Event(path, undefined, host)), path);
                    assert.strictEqual(getOriginalURL(v1Event(path, query, host)), path);
                });
            }
        }
    });
});
