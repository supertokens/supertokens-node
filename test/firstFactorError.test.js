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
const { printPath } = require("./utils");
const http = require("http");
let assert = require("assert");
let ST = require("../");
let EmailPassword = require("../recipe/emailpassword");
let ThirdParty = require("../recipe/thirdparty");
let Session = require("../recipe/session");
let SessionError = require("../recipe/session").Error;
const { AuthUtils } = require("../lib/build/authUtils");
const SuperTokens = require("../lib/build/supertokens").default;

describe(`First factor error message: ${printPath("[test/firstFactorError.test.js]")}`, function () {
    let fakeCore;

    beforeEach(async function () {
        // a minimal fake core whose "public" tenant only has emailpassword enabled as a first factor
        fakeCore = http.createServer((req, res) => {
            res.setHeader("content-type", "application/json");
            if (req.url.startsWith("/apiversion")) {
                res.end(JSON.stringify({ versions: ["5.4"] }));
            } else if (req.url.includes("/recipe/multitenancy/tenant/v2")) {
                res.end(
                    JSON.stringify({
                        status: "OK",
                        emailPassword: { enabled: true },
                        thirdParty: { enabled: false, providers: [] },
                        passwordless: { enabled: false },
                        firstFactors: ["emailpassword"],
                        requiredSecondaryFactors: null,
                        coreConfig: {},
                    })
                );
            } else {
                res.statusCode = 404;
                res.end("{}");
            }
        });
        await new Promise((resolve) => fakeCore.listen(0, "127.0.0.1", resolve));
        ST.init({
            supertokens: { connectionURI: "http://127.0.0.1:" + fakeCore.address().port },
            appInfo: { apiDomain: "api.supertokens.io", appName: "SuperTokens", websiteDomain: "supertokens.io" },
            recipeList: [
                EmailPassword.init(),
                ThirdParty.init({ signInAndUpFeature: { providers: [] } }),
                Session.init(),
            ],
        });
    });

    afterEach(async function () {
        await new Promise((resolve) => fakeCore.close(resolve));
    });

    async function getError(factorIds, hasSession) {
        try {
            await AuthUtils.filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid(
                SuperTokens.getInstanceOrThrowError(),
                factorIds,
                "public",
                hasSession,
                {}
            );
        } catch (err) {
            return err;
        }
        assert.fail("expected an error to be thrown");
    }

    it("names the disabled factor and the tenant when there is no session", async function () {
        const err = await getError(["thirdparty"], false);
        assert(SessionError.isErrorFromSuperTokens(err));
        assert.strictEqual(err.type, SessionError.UNAUTHORISED);
        assert(err.message.includes("thirdparty"));
        assert(err.message.includes("public"));
        assert(err.message.includes("not enabled as first factors"));
    });

    it("names every requested factor when several are disabled", async function () {
        const err = await getError(["thirdparty", "otp-email"], false);
        assert.strictEqual(err.type, SessionError.UNAUTHORISED);
        assert(err.message.includes("thirdparty, otp-email"));
    });

    it("does not throw when at least one factor is a valid first factor", async function () {
        const res = await AuthUtils.filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid(
            SuperTokens.getInstanceOrThrowError(),
            ["thirdparty", "emailpassword"],
            "public",
            false,
            {}
        );
        assert.deepStrictEqual(res, ["emailpassword"]);
    });
});
