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
const JsonWebToken = require("jsonwebtoken");

const { printPath, setupST, startST, killAllST, cleanST } = require("../../utils");
let { Querier } = require("../../../lib/build/querier");
let { maxVersion } = require("../../../lib/build/utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../../../lib/build/processState");
let SuperTokens = require("../../../");
let Session = require("../../../recipe/session");
let { middleware, errorHandler } = require("../../../framework/express");
const { TrueClaim, UndefinedClaim } = require("./testClaims");

describe(`sessionClaims/withJWT: ${printPath("[test/session/claims/withJWT.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("JWT + claims interaction", () => {
        it("should create the right access token payload with claims and JWT enabled", async function () {
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                createNewSession: async (input) => {
                                    input.accessTokenPayload = {
                                        ...input.accessTokenPayload,
                                        ...(await TrueClaim.build(input.userId, input.userContext)),
                                    };
                                    return oI.createNewSession(input);
                                },
                            }),
                        },
                        jwt: { enable: true },
                    }),
                ],
            });

            // Only run for version >= 2.9
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.8") === "2.8") {
                return;
            }

            let app = express();

            app.use(middleware());
            app.use(express.json());

            app.post("/create", async (req, res) => {
                let session = await Session.createNewSession(req, res, "userId", undefined, {});
                res.status(200).json({ sessionHandle: session.getHandle() });
            });

            app.use(errorHandler());

            let createJWTResponse = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let sessionHandle = createJWTResponse.body.sessionHandle;

            const sessionInfo = await Session.getSessionInformation(sessionHandle);
            let accessTokenPayload = sessionInfo.accessTokenPayload;
            assert.equal(accessTokenPayload.sub, undefined);
            assert.equal(accessTokenPayload.iss, undefined);
            assert.notStrictEqual(accessTokenPayload.jwt, undefined);
            assert.strictEqual(accessTokenPayload._jwtPName, "jwt");

            let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt);
            assert.notStrictEqual(decodedJWT, null);
            assert.strictEqual(decodedJWT["sub"], "userId");
            assert.strictEqual(decodedJWT.iss, "https://api.supertokens.io/auth");
            assert.strictEqual(decodedJWT._jwtPName, undefined);

            assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), true);
            assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), true);

            const failingValidator = UndefinedClaim.validators.hasValue(true);
            assert.deepStrictEqual(
                await Session.validateClaimsInJWTPayload(sessionInfo.userId, decodedJWT, () => [
                    TrueClaim.validators.hasValue(true, 2),
                    failingValidator,
                ]),
                {
                    status: "OK",
                    invalidClaims: [
                        {
                            id: failingValidator.id,
                            reason: {
                                actualValue: undefined,
                                expectedValue: true,
                                message: "value does not exist",
                            },
                        },
                    ],
                }
            );
        });
    });
});
