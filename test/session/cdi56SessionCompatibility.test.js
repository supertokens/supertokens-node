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

/**
 * From CDI 5.6 session verification is stateless: the core never returns a replacement access
 * token from verify and, with checkDatabase, rejects an access token from a rotated-out refresh
 * token branch. On older cores the behaviour is unchanged.
 */

const { printPath, createCoreApplication, isCDIVersionCompatible } = require("../utils");
const assert = require("assert");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");

async function init() {
    const connectionURI = await createCoreApplication();
    SuperTokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [Session.init()],
    });
    return connectionURI;
}

function getPayload(jwt) {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
}

describe(`CDI 5.6 session compatibility: ${printPath(
    "[test/session/cdi56SessionCompatibility.test.js]"
)}`, function () {
    beforeEach(function () {
        ProcessState.getInstance().reset();
    });

    it("verify with checkDatabase never returns a new access token on CDI >= 5.6", async function () {
        await init();
        const verifyIsStateless = await isCDIVersionCompatible("5.6");

        const session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = session.getAllSessionTokensDangerously();

        // Changes the access token payload stored in the database only
        assert.ok(await Session.mergeIntoAccessTokenPayload(session.getHandle(), { updated: true }));

        const verified = await Session.getSessionWithoutRequestResponse(tokens.accessToken, undefined, {
            checkDatabase: true,
        });
        const verifiedTokens = verified.getAllSessionTokensDangerously();

        if (verifyIsStateless) {
            assert.strictEqual(verifiedTokens.accessAndFrontTokenUpdated, false);
            assert.strictEqual(verifiedTokens.accessToken, tokens.accessToken);
            assert.strictEqual(verified.getAccessTokenPayload().updated, undefined);
        } else {
            assert.strictEqual(verifiedTokens.accessAndFrontTokenUpdated, true);
            assert.notStrictEqual(verifiedTokens.accessToken, tokens.accessToken);
            assert.strictEqual(verified.getAccessTokenPayload().updated, true);
        }

        // The payload change reaches the client at its next refresh
        const refreshed = await Session.refreshSessionWithoutRequestResponse(tokens.refreshToken, true);
        assert.strictEqual(refreshed.getAccessTokenPayload().updated, true);
    });

    it("a two-generation-old access token with checkDatabase is TRY_REFRESH_TOKEN on CDI >= 5.6 and the session survives the refresh", async function () {
        await init();
        const verifyIsStateless = await isCDIVersionCompatible("5.6");

        const session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const oldTokens = session.getAllSessionTokensDangerously();

        let refreshed = await Session.refreshSessionWithoutRequestResponse(oldTokens.refreshToken, true);
        // On CDI < 5.6 the core rotates the refresh token when the new access token is first verified
        await Session.getSessionWithoutRequestResponse(refreshed.getAllSessionTokensDangerously().accessToken);
        refreshed = await Session.refreshSessionWithoutRequestResponse(
            refreshed.getAllSessionTokensDangerously().refreshToken,
            true
        );
        const latestTokens = refreshed.getAllSessionTokensDangerously();

        let error;
        try {
            await Session.getSessionWithoutRequestResponse(oldTokens.accessToken, undefined, { checkDatabase: true });
        } catch (err) {
            error = err;
        }

        if (verifyIsStateless) {
            assert.ok(error !== undefined, "expected getSession to throw");
            assert.strictEqual(error.type, Session.Error.TRY_REFRESH_TOKEN);
            assert.strictEqual(error.message, "rotated-out token branch; refresh required");
        } else {
            assert.strictEqual(error, undefined);
        }

        const afterRefresh = await Session.refreshSessionWithoutRequestResponse(latestTokens.refreshToken, true);
        assert.strictEqual(afterRefresh.getHandle(), session.getHandle());
        const verified = await Session.getSessionWithoutRequestResponse(
            afterRefresh.getAllSessionTokensDangerously().accessToken,
            undefined,
            { checkDatabase: true }
        );
        assert.strictEqual(verified.getHandle(), session.getHandle());
    });

    it("any other UNAUTHORISED from verify with checkDatabase is still UNAUTHORISED", async function () {
        await init();

        const session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = session.getAllSessionTokensDangerously();
        await Session.revokeSession(session.getHandle());

        let error;
        try {
            await Session.getSessionWithoutRequestResponse(tokens.accessToken, undefined, { checkDatabase: true });
        } catch (err) {
            error = err;
        }
        assert.ok(error !== undefined, "expected getSession to throw");
        assert.strictEqual(error.type, Session.Error.UNAUTHORISED);
    });

    it("a token minted by a CDI 5.4 refresh is verified without calling the core on CDI >= 5.6", async function () {
        const connectionURI = await init();
        const verifyIsStateless = await isCDIVersionCompatible("5.6");

        const session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            SuperTokens.convertToRecipeUserId("test-user-id")
        );
        const tokens = session.getAllSessionTokensDangerously();

        // Refresh as an SDK still on CDI 5.4 would (rolling deploys, other services)
        const refreshResp = await fetch(`${connectionURI}/recipe/session/refresh`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "cdi-version": "5.4",
                rid: "session",
            },
            body: JSON.stringify({
                refreshToken: tokens.refreshToken,
                enableAntiCsrf: false,
                useDynamicSigningKey: true,
            }),
        });
        const refreshBody = await refreshResp.json();
        assert.strictEqual(refreshBody.status, "OK");
        const accessToken = refreshBody.accessToken.token;
        assert.ok(
            getPayload(accessToken).parentRefreshTokenHash1 !== undefined,
            "a CDI 5.4 refresh should mint a token with a parentRefreshTokenHash1"
        );

        const verified = await Session.getSessionWithoutRequestResponse(accessToken);
        assert.strictEqual(verified.getHandle(), session.getHandle());
        // On CDI < 5.6 the core promotes the token and returns a new one
        assert.strictEqual(verified.getAllSessionTokensDangerously().accessAndFrontTokenUpdated, !verifyIsStateless);

        const calledCore =
            (await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 0)) !== undefined;
        assert.strictEqual(calledCore, !verifyIsStateless);
    });
});
