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
const {
    printPath,
    setupST,
    startST,
    createServerlessCacheForTesting,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    mockLambdaProxyEvent,
    mockLambdaProxyEventV2,
} = require("../utils");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let { middleware } = require("../../framework/awsLambda");
let Session = require("../../recipe/session");
let { verifySession } = require("../../recipe/session/framework/awsLambda");
const { removeServerlessCache } = require("../../lib/build/utils");

describe(`AWS Lambda: ${printPath("[test/framework/awsLambda.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    //check basic usage of session
    it("test basic usage of sessions for lambda proxy event v1", async function () {
        await startST();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath: "/dev",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let createSession = async (awsEvent, _) => {
            await Session.createNewSession(awsEvent, "userId", {}, {});
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let verifyLambdaSession = async (awsEvent, _) => {
            return {
                body: JSON.stringify({
                    user: awsEvent.session.getUserId(),
                }),
                statusCode: 200,
            };
        };

        let revokeSession = async (awsEvent, _) => {
            await awsEvent.session.revokeSession();
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let proxy = "/dev";
        let createAccountEvent = mockLambdaProxyEvent("/create", "POST", null, null, proxy);
        let result = await middleware(createSession)(createAccountEvent, undefined);

        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let res = extractInfoFromResponse(result);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        let verifySessionEvent = mockLambdaProxyEvent("/session/verify", "POST", null, null, proxy);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "try refresh token" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res.accessToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession, {
            antiCsrfCheck: false,
        })(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        let refreshSessionEvent = mockLambdaProxyEvent("/auth/session/refresh", "POST", null, null, proxy);
        result = await middleware()(refreshSessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        refreshSessionEvent = mockLambdaProxyEvent(
            "/auth/session/refresh",
            "POST",
            {
                Cookie: `sRefreshToken=${res.refreshToken}; sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy
        );
        result = await middleware()(refreshSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let res2 = extractInfoFromResponse(result);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        verifySessionEvent = mockLambdaProxyEvent(
            "/session/verify",
            "POST",
            {
                Cookie: `sAccessToken=${res2.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };
        let res3 = extractInfoFromResponse(result);
        assert(res3.accessToken !== undefined);

        let revokeSessionEvent = mockLambdaProxyEvent(
            "/session/revoke",
            "POST",
            {
                Cookie: `sAccessToken=${res3.accessToken}; sIdRefreshToken=${res2.idRefreshTokenFromCookie}`,
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy
        );
        result = await verifySession(revokeSession)(revokeSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            ...result.multiValueHeaders,
        };

        let sessionRevokedResponseExtracted = extractInfoFromResponse(result);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    //check basic usage of session
    it("test basic usage of sessions for lambda proxy event v2", async function () {
        await startST();
        SuperTokens.init({
            framework: "awsLambda",
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
                apiGatewayPath: "/dev",
            },
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let createSession = async (awsEvent, _) => {
            await Session.createNewSession(awsEvent, "userId", {}, {});
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let verifyLambdaSession = async (awsEvent, _) => {
            return {
                body: JSON.stringify({
                    user: awsEvent.session.getUserId(),
                }),
                statusCode: 200,
            };
        };

        let revokeSession = async (awsEvent, _) => {
            await awsEvent.session.revokeSession();
            return {
                body: JSON.stringify(""),
                statusCode: 200,
            };
        };

        let proxy = "/dev";
        let createAccountEvent = mockLambdaProxyEventV2("/create", "POST", null, null, proxy, null);
        let result = await middleware(createSession)(createAccountEvent, undefined);

        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let res = extractInfoFromResponse(result);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        let verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
            `sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
        ]);
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "try refresh token" });

        verifySessionEvent = mockLambdaProxyEventV2(
            "/session/verify",
            "POST",
            {
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res.accessToken}`, `sIdRefreshToken=${res.idRefreshTokenFromCookie}`]
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        verifySessionEvent = mockLambdaProxyEventV2("/session/verify", "POST", null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
            `sIdRefreshToken=${res.idRefreshTokenFromCookie}`,
        ]);
        result = await verifySession(verifyLambdaSession, {
            antiCsrfCheck: false,
        })(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });

        let refreshSessionEvent = mockLambdaProxyEventV2("/auth/session/refresh", "POST", null, null, proxy, null);
        result = await middleware()(refreshSessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { message: "unauthorised" });

        refreshSessionEvent = mockLambdaProxyEventV2(
            "/auth/session/refresh",
            "POST",
            {
                "anti-csrf": res.antiCsrf,
            },
            null,
            proxy,
            [`sRefreshToken=${res.refreshToken}`, `sIdRefreshToken=${res.idRefreshTokenFromCookie}`]
        );
        result = await middleware()(refreshSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let res2 = extractInfoFromResponse(result);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        verifySessionEvent = mockLambdaProxyEventV2(
            "/session/verify",
            "POST",
            {
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res2.accessToken}`, `sIdRefreshToken=${res2.idRefreshTokenFromCookie}`]
        );
        result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined);
        assert.deepStrictEqual(JSON.parse(result.body), { user: "userId" });
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };
        let res3 = extractInfoFromResponse(result);
        assert(res3.accessToken !== undefined);

        let revokeSessionEvent = mockLambdaProxyEventV2(
            "/session/revoke",
            "POST",
            {
                "anti-csrf": res2.antiCsrf,
            },
            null,
            proxy,
            [`sAccessToken=${res3.accessToken}`, `sIdRefreshToken=${res2.idRefreshTokenFromCookie}`]
        );
        result = await verifySession(revokeSession)(revokeSessionEvent, undefined);
        result.headers = {
            ...result.headers,
            "set-cookie": result.cookies,
        };

        let sessionRevokedResponseExtracted = extractInfoFromResponse(result);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });
});
