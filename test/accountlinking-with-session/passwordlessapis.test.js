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
    createEmailPasswordUser,
    makeUserPrimary,
    getSessionForUser,
    getUpdatedUserFromDBForRespCompare,
    createThirdPartyUser,
    createPasswordlessUser,
    linkUsers,
} = require("./utils");
let supertokens = require("../..");
let assert = require("assert");
let Passwordless = require("../../recipe/passwordless");

describe(`passwordless accountlinkingTests w/ session: ${printPath(
    "[test/accountlinking-with-session/passwordlessapis.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("consumeCodePOST", function () {
        describe("during sign up", () => {
            describe("linking", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should link to session user if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_019)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    let sessionUser = await createEmailPasswordUser(email1, false);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if sign up is not allowed", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    const conflictingUser = await createThirdPartyUser(email2, false);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                    });
                });

                it("should error if linking is not allowed because of conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    const conflictingUser = await createThirdPartyUser(email2, true);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_018)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user) => {
                            if (accountInfo.email === email1 && user === undefined) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user) => {
                            if (accountInfo.email === email1 && user === undefined) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating and session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });
        });
        describe("during sign in", () => {
            describe("linking", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should link to session user if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);
                    await createPasswordlessUser({ email: email2 });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_019)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    let sessionUser = await createEmailPasswordUser(email1, false);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if the authenticating user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    let user = await createPasswordlessUser({ email: email2 });
                    user = await makeUserPrimary(user);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_017)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user) => {
                            if (accountInfo.email === email1 && user === undefined) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user) => {
                            if (accountInfo.email === email1 && user === undefined) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createPasswordlessUser({ email: email2 });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createPasswordlessUser({ email: email2 });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating and session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup({
                        shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                            if (user !== undefined && user.id === session.getUserId()) {
                                return { shouldAutomaticallyLink: false };
                            }
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createPasswordlessUser({ email: email2 });

                    const session = await getSessionForUser(sessionUser);
                    const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                    const resp = await consumeCodePOST(app, code, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });
        });

        describe("user association", () => {
            it("should associate an exiting user with the current tenant if the session user has one with the same account info", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createPasswordlessUser({ email: email2 }, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                const resp = await consumeCodePOST(app, code, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.strictEqual(body.user.id, sessionUser.id);
                assert.strictEqual(body.user.loginMethods.length, 2);
                assert(!body.createdNewRecipeUser);
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.map((lm) => lm.recipeUserId)),
                    new Set([sessionUser.id, otherTenantUser.id])
                );
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.find((lm) => lm.recipeId === "passwordless").tenantIds),
                    new Set(["public", "tenant1"])
                );
            });

            it("should not associate an exiting user with the current tenant if the session user is not linked to it", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                await createPasswordlessUser({ email: email2 }, true, "tenant1");

                const session = await getSessionForUser(sessionUser);
                const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                const resp = await consumeCodePOST(app, code, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.strictEqual(body.user.id, sessionUser.id);
                assert.strictEqual(body.user.loginMethods.length, 2);
                assert(body.createdNewRecipeUser);
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.find((lm) => lm.recipeId === "passwordless").tenantIds),
                    new Set(["public"])
                );
            });

            it("should error out if the credentials are wrong", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createPasswordlessUser({ email: email2 }, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const code = await Passwordless.createCode({ email: email2, tenantId: "public", session });
                code.preAuthSessionId += "XXX";
                const resp = await consumeCodePOST(app, code, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "RESTART_FLOW_ERROR");

                const updatedSessionUser = await supertokens.getUser(sessionUser.id);
                assert.deepStrictEqual(
                    updatedSessionUser.loginMethods.find((lm) => lm.recipeId === "passwordless").tenantIds,
                    ["tenant1"]
                );
            });
        });
    });

    describe("createCodePOST", function () {
        it("should create a code if the session user is already primary and have the appropriate flowType", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();
            let sessionUser = await createEmailPasswordUser(email1, true);
            sessionUser = await makeUserPrimary(sessionUser);
            await createPasswordlessUser({ email: email2 });

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
            assert.strictEqual(body.flowType, "USER_INPUT_CODE");
        });

        it("should create a code if the session user is not primary user using the same email without verification", async () => {
            const email1 = getTestEmail("1");
            const app = await setup();
            let sessionUser = await createEmailPasswordUser(email1, false);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email1 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should error if there is another user using the same email without verification and it's not the session user", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();
            await createEmailPasswordUser(email1, false);
            let sessionUser = await createPasswordlessUser({ email: email2 });

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email1 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
            assert.strictEqual(
                body.reason,
                "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)"
            );
        });

        it("should create a code if the session user can be made primary", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();
            let sessionUser = await createEmailPasswordUser(email1, true);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should create a code even if the session user cannot be made primary - conflicting primary user", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();

            const conflictingUser = await createThirdPartyUser(email1, false);
            await makeUserPrimary(conflictingUser);

            let sessionUser = await createEmailPasswordUser(email1, true);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should create a code even if the session user cannot be made primary - email verification", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();

            let sessionUser = await createEmailPasswordUser(email1, false);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should error if sign up is not allowed", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup();

            const conflictingUser = await createThirdPartyUser(email2, false);
            await makeUserPrimary(conflictingUser);

            let sessionUser = await createEmailPasswordUser(email1, true);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.deepStrictEqual(body, {
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
            });
        });

        it("should create a code if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup({
                shouldDoAutomaticAccountLinking: (accountInfo, user) => {
                    if (accountInfo.email === email1 && user === undefined) {
                        return { shouldAutomaticallyLink: false };
                    }
                    return {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    };
                },
            });

            let sessionUser = await createEmailPasswordUser(email1, true);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should create a code if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup({
                shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                    if (user !== undefined && user.id === session.getUserId()) {
                        return { shouldAutomaticallyLink: false };
                    }
                    return {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    };
                },
            });

            let sessionUser = await createEmailPasswordUser(email1, true);
            sessionUser = await makeUserPrimary(sessionUser);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });

        it("should create a code if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const app = await setup({
                shouldDoAutomaticAccountLinking: (accountInfo, user, session) => {
                    if (user !== undefined && user.id === session.getUserId()) {
                        return { shouldAutomaticallyLink: false };
                    }
                    return {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    };
                },
            });

            let sessionUser = await createEmailPasswordUser(email1, true);

            const session = await getSessionForUser(sessionUser);
            const resp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(resp.status, 200);
            assert.ok(resp.body);

            const body = resp.body;
            assert.strictEqual(body.status, "OK");
        });
    });

    describe("resendCodePOST", function () {
        it("should create a code with the appropriate flowType", async () => {
            const email1 = getTestEmail("1");
            const email2 = getTestEmail("2");
            const emailInputs = [];
            const app = await setup({ emailInputs });
            let sessionUser = await createEmailPasswordUser(email1, true);
            sessionUser = await makeUserPrimary(sessionUser);
            await createPasswordlessUser({ email: email2 });

            const session = await getSessionForUser(sessionUser);
            const createResp = await createCodePOST(app, { email: email2 }, session);
            assert.strictEqual(createResp.status, 200);
            assert.ok(createResp.body);

            const createRespBody = createResp.body;
            assert.strictEqual(createRespBody.status, "OK");
            assert.strictEqual(createRespBody.flowType, "USER_INPUT_CODE");

            const resendResp = await resendCodePOST(
                app,
                {
                    preAuthSessionId: createRespBody.preAuthSessionId,
                    deviceId: createRespBody.deviceId,
                },
                session
            );
            assert.strictEqual(resendResp.status, 200);
            assert.ok(resendResp.body);

            const resendRespBody = resendResp.body;
            assert.strictEqual(resendRespBody.status, "OK");

            assert.strictEqual(emailInputs.length, 2);
            assert.strictEqual(emailInputs[0].urlWithLinkCode, undefined);
            assert.strictEqual(emailInputs[1].urlWithLinkCode, undefined);
            assert.strictEqual(emailInputs[1].isFirstFactor, false);
            assert.strictEqual(emailInputs[1].isFirstFactor, false);
        });
    });
});

async function consumeCodePOST(app, code, session) {
    return postAPI(
        app,
        "/auth/signinup/code/consume",
        code.userInputCode !== undefined
            ? {
                  preAuthSessionId: code.preAuthSessionId,
                  userInputCode: code.userInputCode,
                  deviceId: code.deviceId,
              }
            : {
                  preAuthSessionId: code.preAuthSessionId,
                  linkCode: code.linkCode,
              },
        session
    );
}

async function createCodePOST(app, accountInfo, session) {
    return postAPI(app, "/auth/signinup/code", accountInfo, session);
}

async function resendCodePOST(app, deviceInfo, session) {
    return postAPI(app, "/auth/signinup/code/resend", deviceInfo, session);
}
