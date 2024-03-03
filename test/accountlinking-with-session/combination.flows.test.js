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
const { printPath, setupST, killAllST, cleanST } = require("../utils");
const {
    getTestEmail,
    setup,
    postAPI,
    getAPI,
    putAPI,
    createEmailPasswordUser,
    makeUserPrimary,
    getSessionForUser,
    getUpdatedUserFromDBForRespCompare,
    getSessionFromResponse,
    createThirdPartyUser,
    linkUsers,
    testPassword,
} = require("./utils");
let supertokens = require("../..");
let assert = require("assert");
let Passwordless = require("../../recipe/passwordless");

describe(`Multi-recipe account linking flows w/ session: ${printPath(
    "[test/accountlinking-with-session/combination.flows.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("Discord-like (fake email)", function () {
        it("should be able to add a password to a fake-email tp user", async () => {
            const app = await setup();

            const createResp = await signInUpPOST(app, undefined, true, undefined);
            assert.strictEqual(createResp.status, 200);
            assert.ok(createResp.body);

            const createRespBody = createResp.body;
            assert.strictEqual(createRespBody.status, "OK");
            const session = await getSessionFromResponse(createResp);

            const mfaInfo = await mfaInfoPUT(app, session);
            const infoBody = mfaInfo.body;
            assert.deepStrictEqual(infoBody.emails.emailpassword, createRespBody.user.emails);

            const addPWResp = await signUpPOST(app, infoBody.emails.emailpassword[0], session);

            assert.strictEqual(addPWResp.body.status, "OK");
            assert.strictEqual(addPWResp.body.user.id, createRespBody.user.id);
            assert.deepStrictEqual(addPWResp.body.user, await getUpdatedUserFromDBForRespCompare(createRespBody.user));
        });

        it("should not be able to sign up with fake-email without a session", async () => {
            const app = await setup();

            const createResp = await signInUpPOST(app, undefined, true, undefined);
            assert.strictEqual(createResp.status, 200);
            assert.ok(createResp.body);

            const createRespBody = createResp.body;
            assert.strictEqual(createRespBody.status, "OK");
            const session = await getSessionFromResponse(createResp);

            const mfaInfo = await mfaInfoPUT(app, session);
            const infoBody = mfaInfo.body;
            assert.deepStrictEqual(infoBody.emails.emailpassword, createRespBody.user.emails);

            const addPWResp = await signUpPOST(app, infoBody.emails.emailpassword[0]);
            assert.deepStrictEqual(addPWResp.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        error: "This email already exists. Please sign in instead.",
                        id: "email",
                    },
                ],
            });

            const addPWResp2 = await signUpPOST(app, "notexists" + infoBody.emails.emailpassword[0]);
            assert.deepStrictEqual(addPWResp2.body, {
                status: "FIELD_ERROR",
                formFields: [
                    {
                        error: "This email already exists. Please sign in instead.",
                        id: "email",
                    },
                ],
            });
        });
    });
});

async function signInUpPOST(app, email, isVerified, session, userId = email, error = undefined) {
    return postAPI(
        app,
        "/auth/signinup",
        {
            thirdPartyId: "custom",
            oAuthTokens: {
                email,
                isVerified,
                userId,
                error,
            },
        },
        session
    );
}

async function signUpPOST(app, email, session, password = testPassword) {
    return postAPI(
        app,
        "/auth/signup",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}

async function signInPOST(app, email, session, password = testPassword) {
    return postAPI(
        app,
        "/auth/signin",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}

async function mfaInfoPUT(app, session) {
    return putAPI(app, "/auth/mfa/info", undefined, session);
}
