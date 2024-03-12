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
    linkUsers,
    testPassword,
    createPasswordlessUser,
} = require("./utils");
let supertokens = require("../..");
let assert = require("assert");
let Passwordless = require("../../recipe/passwordless");

describe(`emailpassword accountlinkingTests w/ session: ${printPath(
    "[test/accountlinking-with-session/emailpasswordapis.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("signUpPOST", function () {
        describe("linking without email verification requirements", () => {
            it("should link to session user if the session user is already primary", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup({
                    shouldDoAutomaticAccountLinkingValue: {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: false,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);

                const resp = await signUpPOST(app, email2, session);
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
                const app = await setup({
                    shouldDoAutomaticAccountLinkingValue: {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: false,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);

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
                const app = await setup({
                    shouldDoAutomaticAccountLinkingValue: {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: false,
                    },
                });

                const conflictingUser = await createPasswordlessUser({ email: email1 }, true);
                await makeUserPrimary(conflictingUser);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "SIGN_UP_NOT_ALLOWED");
                assert.strictEqual(
                    body.reason,
                    "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)"
                );
            });

            it("should error if sign up is not allowed", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup({
                    shouldDoAutomaticAccountLinkingValue: {
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: false,
                    },
                });

                const conflictingUser = await createEmailPasswordUser(email2, true);
                await makeUserPrimary(conflictingUser);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.deepStrictEqual(body, {
                    formFields: [
                        {
                            error: "This email already exists. Please sign in instead.",
                            id: "email",
                        },
                    ],
                    status: "FIELD_ERROR",
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                const otherUser = await createThirdPartyUser(email2, true);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                const otherUser = await createThirdPartyUser(email2, true);

                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                const otherUser = await createThirdPartyUser(email2, true);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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
                            shouldRequireVerification: false,
                        };
                    },
                });

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
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

        describe("linking with email verification required and email verified in session user with", () => {
            it("should allow sign up if the session user is already primary", async () => {
                const email1 = getTestEmail("1");
                const app = await setup();
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);

                const resp = await signUpPOST(app, email1, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.strictEqual(body.user.id, sessionUser.id);
                assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
            });

            it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                const email1 = getTestEmail("1");
                const app = await setup();

                const conflictingUser = await createPasswordlessUser({ email: email1 }, true);
                await makeUserPrimary(conflictingUser);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email1, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "SIGN_UP_NOT_ALLOWED");
                assert.strictEqual(
                    body.reason,
                    "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)"
                );
            });

            it("should try linking by account info (and fail) if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert(!body.isPrimaryUser);
            });

            it("should try linking by account info (and fail) but make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, otherUser.id);
                assert(!body.user.isPrimaryUser);

                sessionUser = await supertokens.getUser(sessionUser.id);
                assert(sessionUser.isPrimaryUser);
            });
        });

        describe("linking with email verification required", () => {
            it("should not allow sign up even if the session user is already primary", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);

                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "SIGN_UP_NOT_ALLOWED");
            });

            it("should not allow signup if the session user can be made primary", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "SIGN_UP_NOT_ALLOWED");
            });

            it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();

                const conflictingUser = await createPasswordlessUser({ email: email1 }, true);
                await makeUserPrimary(conflictingUser);

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "SIGN_UP_NOT_ALLOWED");
                assert.strictEqual(
                    body.reason,
                    "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)"
                );
            });

            it("should try to link by account info/make the authenticating user primary (and fail) if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
                assert(!body.user.isPrimaryUser);
                assert.strictEqual(body.user.loginMethods.length, 1);
            });

            it("should try linking by account info/make the session user primary (and fail) if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, otherUser.id);

                sessionUser = await supertokens.getUser(sessionUser.id);
                assert(sessionUser.isPrimaryUser);
            });

            it("should try make the authenticating primary (and fail) if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
                assert(!body.user.isPrimaryUser);
                assert.strictEqual(body.user.loginMethods.length, 1);
            });

            it("should try link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
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

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, otherUser.id);
                assert(!body.user.isPrimaryUser);

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

                let sessionUser = await createThirdPartyUser(email1, true);

                const session = await getSessionForUser(sessionUser);
                const resp = await signUpPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
                assert(!body.user.isPrimaryUser);
                assert.strictEqual(body.user.loginMethods.length, 1);

                sessionUser = await supertokens.getUser(sessionUser.id);
                assert(sessionUser.isPrimaryUser);
            });
        });
    });

    describe("signInPOST", function () {
        describe("during normal sign in", () => {
            describe("with an email verified user", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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
                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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
                    await createEmailPasswordUser(email2, true);

                    let sessionUser = await createPasswordlessUser({ email: email1 }, true);
                    const session = await getSessionForUser(sessionUser);

                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    let sessionUser = await createThirdPartyUser(email1, false);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

                    let user = await createEmailPasswordUser(email2, true);
                    user = await makeUserPrimary(user);

                    let sessionUser = await createThirdPartyUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_010)",
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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
                    await createEmailPasswordUser(email2, true);

                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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
                    await createEmailPasswordUser(email2, true);

                    let sessionUser = await createThirdPartyUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

            describe("with an unverified user", () => {
                it("should not allow sign in if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");
                });

                it("should not allow sign in if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();
                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);
                    await createEmailPasswordUser(email2, false);

                    let sessionUser = await createPasswordlessUser({ email: email1 }, true);
                    const session = await getSessionForUser(sessionUser);

                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    const app = await setup();

                    let sessionUser = await createThirdPartyUser(email1, false);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
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

                    let user = await createEmailPasswordUser(email2, false);
                    user = await makeUserPrimary(user);

                    let sessionUser = await createThirdPartyUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_009)",
                    });
                });

                it("should not allow sign in if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should block sign in but make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
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
                    await createEmailPasswordUser(email2, false);

                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should try make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should not allow sign in but make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
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
                    await createEmailPasswordUser(email2, false);

                    let sessionUser = await createThirdPartyUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_NOT_ALLOWED");

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should not make the authenticating user primary, only the session user if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
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

                    let sessionUser = await createThirdPartyUser(email1, true);
                    await createEmailPasswordUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInPOST(app, email2, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
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
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createEmailPasswordUser(email2, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signInPOST(app, email2, session);
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
                    new Set(body.user.loginMethods.find((lm) => lm.recipeId === "emailpassword").tenantIds),
                    new Set(["public", "tenant1"])
                );
            });

            it("should not associate an exiting user with the current tenant if the session user is not linked to it", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                await createEmailPasswordUser(email2, true, "tenant1");

                const session = await getSessionForUser(sessionUser);
                const resp = await signInPOST(app, email2, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "WRONG_CREDENTIALS_ERROR");

                const updatedSessionUser = await supertokens.getUser(sessionUser.id);
                assert(!updatedSessionUser.loginMethods.some((lm) => lm.recipeId === "emailpassword"));
            });

            it("should error out if the credentials are wrong", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                const app = await setup();
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createEmailPasswordUser(email2, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signInPOST(app, email2, session, "error");
                assert.strictEqual(resp.status, 200);

                const updatedSessionUser = await supertokens.getUser(sessionUser.id);
                assert.deepStrictEqual(
                    updatedSessionUser.loginMethods.find((lm) => lm.recipeId === "emailpassword").tenantIds,
                    ["tenant1"]
                );
            });
        });
    });
});

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
