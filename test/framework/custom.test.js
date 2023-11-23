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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("../utils");
let assert = require("assert");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../..");
let CustomFramework = require("../../framework/custom");
let Session = require("../../recipe/session");
let { verifySession } = require("../../recipe/session/framework/custom");
let { Headers } = require("cross-fetch");
const sinon = require("sinon");

describe(`Custom framework: ${printPath("[test/framework/custom.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    afterEach(async function () {
        try {
            await this.server.close();
        } catch (err) {}
    });
    after(async function () {
        await killAllST();
        await cleanST();
    });

    // - check if session verify middleware responds with a nice error even without the global error handler
    it("test session verify middleware without error handler added", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "custom",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const req = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/verify",
            query: {},
            headers: new Headers(),
            cookies: {},
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp = new CustomFramework.CollectingResponse();

        const verifyResult = await verifySession()(req, resp);

        assert.strictEqual(verifyResult, undefined);
        assert.strictEqual(resp.statusCode, 401);
        assert.deepStrictEqual(JSON.parse(resp.body), { message: "unauthorised" });
    });

    // check basic usage of session
    it("test basic usage of sessions", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            framework: "custom",
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const middleware = CustomFramework.middleware();

        const req = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/session/create",
            query: {},
            headers: new Headers(),
            cookies: {},
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp = new CustomFramework.CollectingResponse();

        await Session.createNewSession(req, resp, "public", SuperTokens.convertToRecipeUserId("testUserId"));

        let res = extractInfoFromResponse(resp);

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.refreshToken !== undefined);

        const req2 = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/session/refresh",
            query: {},
            headers: new Headers([["anti-csrf", res.antiCsrf]]),
            cookies: {
                sAccessToken: res.accessToken,
                sRefreshToken: res.refreshToken,
            },
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp2 = new CustomFramework.CollectingResponse();

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        await Session.refreshSession(req2, resp2);
        let res2 = extractInfoFromResponse(resp2);

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.refreshToken !== undefined);

        const req3 = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/session/verify",
            query: {},
            headers: new Headers(),
            cookies: {
                sAccessToken: res2.accessToken,
            },
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp3 = new CustomFramework.CollectingResponse();
        await verifySession()(req3, resp3);

        let res3 = extractInfoFromResponse(resp3);
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);

        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        const req4 = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/session/verify",
            query: {},
            headers: new Headers(),
            cookies: {
                sAccessToken: res3.accessToken,
            },
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp4 = new CustomFramework.CollectingResponse();
        await verifySession()(req4, resp4);
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        const req5 = new CustomFramework.PreParsedRequest({
            method: "get",
            url: "/session/verify",
            query: {},
            headers: new Headers(),
            cookies: {
                sAccessToken: res3.accessToken,
            },
            getFormBody: () => {},
            getJSONBody: () => {},
        });
        const resp5 = new CustomFramework.CollectingResponse();
        await verifySession()(req5, resp5);
        await req5.session.revokeSession();
        let sessionRevokedResponseExtracted = extractInfoFromResponse(resp5);
        assert.strictEqual(sessionRevokedResponseExtracted.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(sessionRevokedResponseExtracted.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(sessionRevokedResponseExtracted.accessToken, "");
        assert.strictEqual(sessionRevokedResponseExtracted.refreshToken, "");
    });
});

describe(`PreParsedRequest`, function () {
    it("User's getJSONBody implementation should be called only once", async function () {
        const mockJSONData = { key: "value" };
        const getJSONBodyUserImplementationStub = sinon.stub().resolves(mockJSONData);

        const req = new CustomFramework.PreParsedRequest({
            getJSONBody: getJSONBodyUserImplementationStub,
        });

        // Call getJSONBody multiple times
        const getJsonBody = req.getJSONBody;
        const jsonData = await getJsonBody();
        const jsonData2 = await req.getJSONBody();

        sinon.assert.calledOnce(getJSONBodyUserImplementationStub);

        assert(JSON.stringify(jsonData) === JSON.stringify(mockJSONData));
        assert(JSON.stringify(jsonData2) === JSON.stringify(mockJSONData));
    });

    it("User's getFormData implementation should be called only once", async function () {
        const mockFormData = { key: "value" };
        const getFormDataUserImplementationStub = sinon.stub().resolves(mockFormData);

        const req = new CustomFramework.PreParsedRequest({
            getFormBody: getFormDataUserImplementationStub,
        });

        // Call getFormData multiple times
        const getFormData = req.getFormData;
        const formData = await getFormData();
        const formData2 = await req.getFormData();

        sinon.assert.calledOnce(getFormDataUserImplementationStub);

        assert(JSON.stringify(formData) === JSON.stringify(mockFormData));
        assert(JSON.stringify(formData2) === JSON.stringify(mockFormData));
    });
});
