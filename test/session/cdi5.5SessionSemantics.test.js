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
const { printPath, createCoreApplication, isCDIVersionCompatible } = require("../utils");
const assert = require("assert");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
const SessionRecipe = require("../../lib/build/recipe/session/recipe").default;
const SessionFunctions = require("../../lib/build/recipe/session/sessionFunctions");
const RecipeUserId = require("../../lib/build/recipeUserId").default;
const { parseJWTWithoutSignatureVerification } = require("../../lib/build/recipe/session/jwt");

/**
 * PLAN-002 unit 10 — supertokens-node adoption of CDI 5.5 session semantics.
 *
 * The behaviours under test only activate when the SDK negotiates CDI >= 5.5 with the core, which
 * requires a core that advertises 5.5. As of writing, no core (released, master, or any PLAN-002 unit
 * branch) advertises 5.5 yet, so the CDI 5.5-gated cases below skip. The remaining cases run on any
 * core and assert the mixed-version-safety guarantee: passing the new inputs against a CDI <= 5.4 core
 * degrades gracefully (the core ignores the 5.5-only fields) and never breaks a create/refresh.
 */
async function initST() {
    const connectionURI = await createCoreApplication();
    SuperTokens.init({
        supertokens: { connectionURI },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "NONE" })],
    });
    return connectionURI;
}

describe(`CDI 5.5 session semantics: ${printPath("[test/session/cdi5.5SessionSemantics.test.js]")}`, function () {
    describe("per-mint accessTokenValidity override (PLAN-002 decision 11)", function () {
        it("createNewSession accepts accessTokenValidity and stays safe on CDI <= 5.4 (field ignored)", async function () {
            await initST();
            const recipeImpl = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            // Passing accessTokenValidity must never break session creation, regardless of CDI version.
            const session = await recipeImpl.createNewSession({
                userId: "user-id",
                recipeUserId: SuperTokens.convertToRecipeUserId("user-id"),
                accessTokenPayload: {},
                sessionDataInDatabase: {},
                tenantId: "public",
                accessTokenValidity: 10 * 1000, // 10s
                userContext: {},
            });

            assert.ok(session);
            const payload = session.getAccessTokenPayload();
            const lifetimeSeconds = payload.exp - payload.iat;

            if (await isCDIVersionCompatible("5.5")) {
                // CDI >= 5.5: the override is honoured, so the minted access token is ~10s (well under the
                // default 3600s). Allow slack for jitter/rounding.
                assert.ok(lifetimeSeconds <= 15, `expected shortened (~10s) lifetime, got ${lifetimeSeconds}s`);
            } else {
                // CDI <= 5.4: the core ignores accessTokenValidity, so the configured default (3600s) applies.
                assert.ok(lifetimeSeconds > 60, `expected default lifetime on CDI<=5.4, got ${lifetimeSeconds}s`);
            }
        });

        it("refreshSession with accessTokenValidity refreshes successfully (safe on CDI <= 5.4)", async function () {
            await initST();
            const recipeImpl = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            const created = await recipeImpl.createNewSession({
                userId: "user-id",
                recipeUserId: SuperTokens.convertToRecipeUserId("user-id"),
                accessTokenPayload: {},
                sessionDataInDatabase: {},
                tenantId: "public",
                userContext: {},
            });
            const { refreshToken } = created.getAllSessionTokensDangerously();

            const refreshed = await recipeImpl.refreshSession({
                refreshToken,
                disableAntiCsrf: true,
                accessTokenValidity: 10 * 1000,
                userContext: {},
            });

            assert.ok(refreshed);
            assert.ok(refreshed.getAllSessionTokensDangerously().accessToken);
        });

        it("out-of-range accessTokenValidity on refresh is retried without the override (CDI >= 5.5)", async function () {
            await initST();
            if (!(await isCDIVersionCompatible("5.5"))) {
                // On CDI <= 5.4 the field is ignored (no rejection), so there is nothing to retry.
                return this.skip();
            }
            const recipeImpl = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            const created = await recipeImpl.createNewSession({
                userId: "user-id",
                recipeUserId: SuperTokens.convertToRecipeUserId("user-id"),
                accessTokenPayload: {},
                sessionDataInDatabase: {},
                tenantId: "public",
                userContext: {},
            });
            const { refreshToken } = created.getAllSessionTokensDangerously();

            // Way above the configured access_token_validity -> core 400s; the SDK must transparently retry
            // the refresh without the override rather than fail (a bad override must never log a user out).
            const refreshed = await recipeImpl.refreshSession({
                refreshToken,
                disableAntiCsrf: true,
                accessTokenValidity: 999_999_999_999,
                userContext: {},
            });

            assert.ok(refreshed);
            assert.ok(refreshed.getAllSessionTokensDangerously().accessToken);
        });
    });

    describe("payloadUpdateAvailable (PLAN-002 decision 6)", function () {
        it("defaults to false on a verify that returns no staleness flag", async function () {
            await initST();
            const recipeImpl = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            const created = await recipeImpl.createNewSession({
                userId: "user-id",
                recipeUserId: SuperTokens.convertToRecipeUserId("user-id"),
                accessTokenPayload: {},
                sessionDataInDatabase: {},
                tenantId: "public",
                userContext: {},
            });
            const accessToken = created.getAccessToken();

            const verified = await recipeImpl.getSession({
                accessToken,
                options: { checkDatabase: true },
                userContext: {},
            });

            assert.ok(verified);
            // Present and false on CDI <= 5.4 (verify never sets it); would be true on CDI >= 5.5 only when
            // the stored payload is actually newer than the token's, which is not the case here.
            assert.strictEqual(verified.getAllSessionTokensDangerously().payloadUpdateAvailable, false);
        });
    });

    describe("token-reuse subtype passthrough (PLAN-002 decision 4)", function () {
        it("theft on refresh-token reuse still throws, carrying recentTokenReuseSubtype (undefined on CDI <= 5.4)", async function () {
            // Mirrors the classic theft repro (create -> refresh -> verify/promote -> re-present old token).
            const connectionURI = await createCoreApplication();
            SuperTokens.init({
                supertokens: { connectionURI },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
            });
            const helpers = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers;

            const response = await SessionFunctions.createNewSession(
                helpers,
                "public",
                new RecipeUserId(""),
                false,
                {},
                {},
                {}
            );

            const response2 = await SessionFunctions.refreshSession(
                helpers,
                response.refreshToken.token,
                response.antiCsrfToken,
                false,
                true,
                {}
            );

            // Verify with the refreshed access token promotes the child, arming theft detection (CDI <= 5.4).
            await SessionFunctions.getSession(
                helpers,
                parseJWTWithoutSignatureVerification(response2.accessToken.token),
                response2.antiCsrfToken,
                true,
                false,
                SessionRecipe.getInstanceOrThrowError().config,
                {}
            );

            try {
                await SessionFunctions.refreshSession(
                    helpers,
                    response.refreshToken.token,
                    response.antiCsrfToken,
                    false,
                    true,
                    {}
                );
                assert.fail("expected TOKEN_THEFT_DETECTED");
            } catch (err) {
                assert.strictEqual(err.type, Session.Error.TOKEN_THEFT_DETECTED);
                // The subtype field is threaded through the error payload to onTokenTheftDetected. It is
                // undefined on CDI <= 5.4 (no classification) and one of RECENT_PREV / ORPHANED_BRANCH /
                // STALE_LINEAGE on CDI >= 5.5.
                if (await isCDIVersionCompatible("5.5")) {
                    assert.ok(
                        ["RECENT_PREV", "ORPHANED_BRANCH", "STALE_LINEAGE"].includes(
                            err.payload.recentTokenReuseSubtype
                        ),
                        `unexpected subtype: ${err.payload.recentTokenReuseSubtype}`
                    );
                } else {
                    assert.strictEqual(err.payload.recentTokenReuseSubtype, undefined);
                }
            }
        });
    });
});
