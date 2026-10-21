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
const { printPath, createCoreApplication } = require("../utils");
const assert = require("assert");
const zlib = require("zlib");
const pako = require("pako");
const request = require("supertest");
const express = require("express");
const Koa = require("koa");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let ExpressFramework = require("../../framework/express");
let KoaFramework = require("../../framework/koa");

const MAX_BODY_SIZE = 1024 * 1024;

// ~250 KB of gzip that inflates to 256 MB
const highlyCompressedBody = zlib.gzipSync(Buffer.alloc(256 * 1024 * 1024, 0x20), { level: 9 });

function signInBody(email = "user@example.com", password = "password123") {
    return JSON.stringify({
        formFields: [
            { id: "email", value: email },
            { id: "password", value: password },
        ],
    });
}

// A valid sign in body of exactly `size` bytes
function paddedSignInBody(size) {
    const body = signInBody();
    const prefix = body.slice(0, -1) + ', "padding": "';
    const padded = prefix + "a".repeat(size - prefix.length - 2) + '"}';
    assert.strictEqual(Buffer.byteLength(padded), size);
    return padded;
}

async function init() {
    const connectionURI = await createCoreApplication();
    SuperTokens.init({
        supertokens: { connectionURI },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "header" })],
    });
}

function getExpressApp() {
    const app = express();
    app.use(ExpressFramework.middleware());
    app.use(ExpressFramework.errorHandler());
    return app;
}

function getKoaHandler() {
    const app = new Koa();
    app.use(KoaFramework.middleware());
    return app.callback();
}

// Counts how many bytes pako produces while running fn, and samples the memory growth
async function measureInflation(fn) {
    const originalOnData = pako.Inflate.prototype.onData;
    let inflatedBytes = 0;
    pako.Inflate.prototype.onData = function (chunk) {
        inflatedBytes += chunk.length;
        return originalOnData.call(this, chunk);
    };

    const memoryUsed = () => {
        const usage = process.memoryUsage();
        return usage.heapUsed + usage.arrayBuffers;
    };
    const memoryBefore = memoryUsed();
    let peakMemory = memoryBefore;
    const sampler = setInterval(() => {
        peakMemory = Math.max(peakMemory, memoryUsed());
    }, 1);

    try {
        const result = await fn();
        peakMemory = Math.max(peakMemory, memoryUsed());
        return { result, inflatedBytes, memoryGrowth: peakMemory - memoryBefore };
    } finally {
        clearInterval(sampler);
        pako.Inflate.prototype.onData = originalOnData;
    }
}

describe(`request body size limit: ${printPath("[test/framework/requestBodySize.test.js]")}`, function () {
    beforeEach(async function () {
        ProcessState.getInstance().reset();
        await init();
        await EmailPassword.signUp("public", "user@example.com", "password123");
    });

    for (const [name, getApp] of [
        ["express", getExpressApp],
        ["koa", getKoaHandler],
    ]) {
        // We write the body directly, so that it is sent as is (superagent would JSON encode Buffers otherwise)
        const sendTo = (path, body, contentEncoding) => {
            const req = request(getApp()).post(path).set("Content-Type", "application/json");
            if (contentEncoding !== undefined) {
                req.set("Content-Encoding", contentEncoding);
            }
            req.write(body);
            return req;
        };

        describe(name, function () {
            it("rejects a gzip body that inflates beyond the limit without inflating all of it", async function () {
                const {
                    result: res,
                    inflatedBytes,
                    memoryGrowth,
                } = await measureInflation(() => sendTo("/auth/signin", highlyCompressedBody, "gzip"));

                assert.strictEqual(res.status, 400);
                assert(
                    inflatedBytes <= MAX_BODY_SIZE + 64 * 1024,
                    `inflated ${inflatedBytes} bytes, expected at most around ${MAX_BODY_SIZE}`
                );
                assert(memoryGrowth < 64 * 1024 * 1024, `memory grew by ${memoryGrowth} bytes`);
            });

            it("rejects a deflate body that inflates beyond the limit", async function () {
                const { result: res, inflatedBytes } = await measureInflation(() =>
                    sendTo("/auth/signin", zlib.deflateSync(Buffer.alloc(8 * MAX_BODY_SIZE, 0x20)), "deflate")
                );

                assert.strictEqual(res.status, 400);
                assert(inflatedBytes <= MAX_BODY_SIZE + 64 * 1024);
            });

            it("rejects an uncompressed body beyond the limit", async function () {
                const res = await sendTo("/auth/signin", Buffer.from(paddedSignInBody(MAX_BODY_SIZE + 1)));

                assert.strictEqual(res.status, 400);
            });

            it("parses a gzip JSON body", async function () {
                const res = await sendTo("/auth/signin", zlib.gzipSync(Buffer.from(signInBody())), "gzip");

                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.status, "OK");
            });

            it("parses an uncompressed JSON body", async function () {
                const res = await sendTo("/auth/signin", Buffer.from(signInBody()));

                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.status, "OK");
            });

            it("parses a JSON body just under the limit", async function () {
                const padded = paddedSignInBody(MAX_BODY_SIZE);

                const res = await sendTo("/auth/signin", zlib.gzipSync(Buffer.from(padded)), "gzip");

                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.body.status, "OK");
            });
        });
    }
});
