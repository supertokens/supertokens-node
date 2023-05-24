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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { AccountLinkingClaim } = require("../../recipe/accountlinking");
let AccountLinking = require("../../recipe/accountlinking").default;
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/accountlinkingclaim.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("adding account linking claim using fetchAndSetClaim should have no effect", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

        let accessTokenPayloadBefore = session.getAccessTokenPayload();
        delete accessTokenPayloadBefore.iat;

        await session.fetchAndSetClaim(AccountLinkingClaim);

        let accessTokenPayloadAfter = session.getAccessTokenPayload();
        delete accessTokenPayloadAfter.iat;

        assert.deepStrictEqual(accessTokenPayloadBefore, accessTokenPayloadAfter);

        let claimData = await session.getClaimValue(AccountLinkingClaim);

        assert(claimData === undefined);
    });

    it("adding account linking claim using setClaimValue should have set the claim correctly", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

        await session.setClaimValue(AccountLinkingClaim, epUser.loginMethods[0].recipeUserId.getAsString());

        let accessTokenPayloadAfter = session.getAccessTokenPayload();
        assert.deepStrictEqual(
            accessTokenPayloadAfter["st-linking"]["v"],
            epUser.loginMethods[0].recipeUserId.getAsString()
        );

        let claimData = await session.getClaimValue(AccountLinkingClaim);

        assert(claimData === epUser.loginMethods[0].recipeUserId.getAsString());
    });

    it("calling resyncAndGetValue has no effect if the claim doesn't exist in the session", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

        let accessTokenPayloadBefore = session.getAccessTokenPayload();
        delete accessTokenPayloadBefore.iat;

        await AccountLinkingClaim.resyncAndGetValue(session);

        let accessTokenPayloadAfter = session.getAccessTokenPayload();
        delete accessTokenPayloadAfter.iat;

        assert.deepStrictEqual(accessTokenPayloadBefore, accessTokenPayloadAfter);
    });

    it("calling resyncAndGetValue should remove the claim from the session if the user id is not in the account to link table", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

        let accessTokenPayloadBefore = session.getAccessTokenPayload();
        delete accessTokenPayloadBefore.iat;

        await session.setClaimValue(AccountLinkingClaim, epUser.loginMethods[0].recipeUserId.getAsString());

        let accessTokenPayloadBetween = session.getAccessTokenPayload();
        assert.deepStrictEqual(
            accessTokenPayloadBetween["st-linking"]["v"],
            epUser.loginMethods[0].recipeUserId.getAsString()
        );

        await AccountLinkingClaim.resyncAndGetValue(session);

        let accessTokenPayloadAfter = session.getAccessTokenPayload();
        delete accessTokenPayloadAfter.iat;

        assert.deepStrictEqual(accessTokenPayloadBefore, accessTokenPayloadAfter);
    });

    it("calling resyncAndGetValue should remove the claim from the session if the user id is associated with another primary user in the account to link table", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let primaryUser1 = (await EmailPassword.signUp("test@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(primaryUser1.loginMethods[0].recipeUserId);

        let primaryUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(primaryUser2.loginMethods[0].recipeUserId);

        let epUser = (await EmailPassword.signUp("test3@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(primaryUser2.loginMethods[0].recipeUserId);

        let accessTokenPayloadBefore = session.getAccessTokenPayload();
        delete accessTokenPayloadBefore.iat;

        await session.setClaimValue(AccountLinkingClaim, epUser.loginMethods[0].recipeUserId.getAsString());

        await AccountLinking.storeIntoAccountToLinkTable(epUser.loginMethods[0].recipeUserId, primaryUser1.id);

        await AccountLinkingClaim.resyncAndGetValue(session);

        let accessTokenPayloadAfter = session.getAccessTokenPayload();
        delete accessTokenPayloadAfter.iat;

        assert.deepStrictEqual(accessTokenPayloadBefore, accessTokenPayloadAfter);
    });

    it("calling resyncAndGetValue should give the value from the session if it still exists in the account to link table", async function () {
        await startST();
        supertokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let primaryUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;
        await AccountLinking.createPrimaryUser(primaryUser2.loginMethods[0].recipeUserId);

        let epUser = (await EmailPassword.signUp("test3@example.com", "password123")).user;

        let session = await Session.createNewSessionWithoutRequestResponse(primaryUser2.loginMethods[0].recipeUserId);

        let accessTokenPayloadBefore = session.getAccessTokenPayload();
        delete accessTokenPayloadBefore.iat;

        await session.setClaimValue(AccountLinkingClaim, epUser.loginMethods[0].recipeUserId.getAsString());

        await AccountLinking.storeIntoAccountToLinkTable(epUser.loginMethods[0].recipeUserId, primaryUser2.id);

        let claimValue = await AccountLinkingClaim.resyncAndGetValue(session);
        assert(claimValue === epUser.loginMethods[0].recipeUserId.getAsString());
    });
});
