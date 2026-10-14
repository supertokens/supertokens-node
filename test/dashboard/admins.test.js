const { ProcessState } = require("../../lib/build/processState");
const {
    printPath,
    createCoreApplication,
    createCoreApplicationWithMultitenancyAndAccountLinking,
} = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");
let Session = require("../../recipe/session");

const adminEmail = "admin@example.com";
const nonAdminEmail = "viewer@example.com";
const dashboardPassword = "password123";

async function setup(dashboardConfig, { withLinkedUser = false } = {}) {
    const connectionURI = withLinkedUser
        ? await createCoreApplicationWithMultitenancyAndAccountLinking()
        : await createCoreApplication();
    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            Dashboard.init(dashboardConfig),
            EmailPassword.init(),
            Session.init(),
            ...(withLinkedUser
                ? [
                      ThirdParty.init({
                          signInAndUpFeature: {
                              providers: [{ config: { thirdPartyId: "google", clients: [{ clientId: "" }] } }],
                          },
                      }),
                      AccountLinking.init(),
                  ]
                : []),
        ],
    });

    for (const email of [adminEmail, nonAdminEmail]) {
        const createResp = await fetch(`${connectionURI}/recipe/dashboard/user`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password: dashboardPassword }),
        });
        assert.strictEqual((await createResp.json()).status, "OK");
    }

    const app = express();
    app.use(middleware());
    app.use(errorHandler());

    const signUpResponse = await EmailPassword.signUp("public", "user@example.com", "password1");
    assert.strictEqual(signUpResponse.status, "OK");

    const recipeUserId = signUpResponse.user.loginMethods[0].recipeUserId;

    if (!withLinkedUser) {
        return { app, recipeUserId: recipeUserId.getAsString() };
    }

    const primaryResp = await AccountLinking.createPrimaryUser(recipeUserId);
    assert.strictEqual(primaryResp.status, "OK");
    const tpResp = await ThirdParty.manuallyCreateOrUpdateUser(
        "public",
        "google",
        "tp-user",
        "user@example.com",
        false
    );
    assert.strictEqual(tpResp.status, "OK");
    const linkResp = await AccountLinking.linkAccounts(tpResp.recipeUserId, primaryResp.user.id);
    assert.strictEqual(linkResp.status, "OK");

    return {
        app,
        recipeUserId: recipeUserId.getAsString(),
        primaryUserId: primaryResp.user.id,
        linkedRecipeUserId: tpResp.recipeUserId.getAsString(),
    };
}

function getUnlink(app, sessionId, recipeUserId) {
    return request(app)
        .get("/auth/dashboard/api/user/unlink?recipeUserId=" + recipeUserId)
        .set("Authorization", `Bearer ${sessionId}`);
}

async function getLoginMethodCount(userId) {
    return (await STExpress.getUser(userId)).loginMethods.length;
}

async function signInToDashboard(app, email) {
    const res = await request(app).post("/auth/dashboard/api/signin").send({ email, password: dashboardPassword });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "OK");
    return res.body.sessionId;
}

function putPassword(app, sessionId, recipeUserId, query = "") {
    return request(app)
        .put("/auth/dashboard/api/user/password" + query)
        .set("Authorization", `Bearer ${sessionId}`)
        .send({ recipeUserId, newPassword: "newPassword123" });
}

function postAnalytics(app, sessionId) {
    return request(app)
        .post("/auth/dashboard/api/analytics")
        .set("Authorization", `Bearer ${sessionId}`)
        .send({ email: "someone@example.com", dashboardVersion: "1.0.0" });
}

function postSignOut(app, sessionId) {
    return request(app).post("/auth/dashboard/api/signout").set("Authorization", `Bearer ${sessionId}`).send();
}

describe(`User Dashboard admins: ${printPath("[test/dashboard/admins.test.js]")}`, () => {
    beforeEach(async () => {
        ProcessState.getInstance().reset();
    });

    describe("non-admin user", () => {
        for (const query of ["?x=/api/signout", "?x=/api/analytics"]) {
            it(`cannot change a password if the query string ends with ${query.slice(3)}`, async () => {
                const { app, recipeUserId } = await setup({ admins: [adminEmail] });
                const sessionId = await signInToDashboard(app, nonAdminEmail);

                const res = await putPassword(app, sessionId, recipeUserId, query);
                assert.strictEqual(res.status, 403);
            });
        }

        it("cannot change a password", async () => {
            const { app, recipeUserId } = await setup({ admins: [adminEmail] });
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const res = await putPassword(app, sessionId, recipeUserId);
            assert.strictEqual(res.status, 403);
        });

        it("can post analytics and sign out", async () => {
            const { app } = await setup({ admins: [adminEmail] });
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const analyticsRes = await postAnalytics(app, sessionId);
            assert.strictEqual(analyticsRes.status, 200);
            assert.strictEqual(analyticsRes.body.status, "OK");

            const signOutRes = await postSignOut(app, sessionId);
            assert.strictEqual(signOutRes.status, 200);
            assert.strictEqual(signOutRes.body.status, "OK");
        });
    });

    describe("read-only dashboard (admins: [])", () => {
        for (const query of ["?x=/api/signout", "?x=/api/analytics"]) {
            it(`cannot change a password if the query string ends with ${query.slice(3)}`, async () => {
                const { app, recipeUserId } = await setup({ admins: [] });
                const sessionId = await signInToDashboard(app, adminEmail);

                const res = await putPassword(app, sessionId, recipeUserId, query);
                assert.strictEqual(res.status, 403);
            });
        }

        it("can post analytics and sign out", async () => {
            const { app } = await setup({ admins: [] });
            const sessionId = await signInToDashboard(app, adminEmail);

            const analyticsRes = await postAnalytics(app, sessionId);
            assert.strictEqual(analyticsRes.status, 200);
            assert.strictEqual(analyticsRes.body.status, "OK");

            const signOutRes = await postSignOut(app, sessionId);
            assert.strictEqual(signOutRes.status, 200);
            assert.strictEqual(signOutRes.body.status, "OK");
        });
    });

    describe("admin user", () => {
        it("can change a password", async () => {
            const { app, recipeUserId } = await setup({ admins: [adminEmail] });
            const sessionId = await signInToDashboard(app, adminEmail);

            const res = await putPassword(app, sessionId, recipeUserId);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
        });
    });

    describe("account unlink", () => {
        it("a non-admin user cannot unlink accounts", async () => {
            const { app, primaryUserId, linkedRecipeUserId } = await setup(
                { admins: [adminEmail] },
                { withLinkedUser: true }
            );
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const res = await getUnlink(app, sessionId, linkedRecipeUserId);
            assert.strictEqual(res.status, 403);
            assert.strictEqual(await getLoginMethodCount(primaryUserId), 2);
        });

        it("a read-only dashboard user (admins: []) cannot unlink accounts", async () => {
            const { app, primaryUserId, linkedRecipeUserId } = await setup({ admins: [] }, { withLinkedUser: true });
            const sessionId = await signInToDashboard(app, adminEmail);

            const res = await getUnlink(app, sessionId, linkedRecipeUserId);
            assert.strictEqual(res.status, 403);
            assert.strictEqual(await getLoginMethodCount(primaryUserId), 2);
        });

        it("an admin can unlink accounts", async () => {
            const { app, primaryUserId, linkedRecipeUserId } = await setup(
                { admins: [adminEmail] },
                { withLinkedUser: true }
            );
            const sessionId = await signInToDashboard(app, adminEmail);

            const res = await getUnlink(app, sessionId, linkedRecipeUserId);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(await getLoginMethodCount(primaryUserId), 1);
        });

        it("any dashboard user can unlink accounts if admins is not set", async () => {
            const { app, primaryUserId, linkedRecipeUserId } = await setup({}, { withLinkedUser: true });
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const res = await getUnlink(app, sessionId, linkedRecipeUserId);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(await getLoginMethodCount(primaryUserId), 1);
        });

        it("a non-admin user can still read user data", async () => {
            const { app, recipeUserId } = await setup({ admins: [adminEmail] });
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const res = await request(app)
                .get("/auth/dashboard/api/user?userId=" + recipeUserId + "&recipeId=emailpassword")
                .set("Authorization", `Bearer ${sessionId}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
        });
    });

    describe("admins not set", () => {
        it("any dashboard user can change a password", async () => {
            const { app, recipeUserId } = await setup({});
            const sessionId = await signInToDashboard(app, nonAdminEmail);

            const res = await putPassword(app, sessionId, recipeUserId);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
        });
    });
});
