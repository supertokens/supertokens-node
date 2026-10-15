const { ProcessState } = require("../../lib/build/processState");
const { printPath, startST, killAllST, setupST, cleanST } = require("../utils");
let STExpress = require("../../");
let Dashboard = require("../../recipe/dashboard");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");
let assert = require("assert");
let Session = require("../../recipe/session");

const adminEmail = "admin@example.com";
const nonAdminEmail = "viewer@example.com";
const dashboardPassword = "password123";

async function setup(dashboardConfig) {
    const connectionURI = await startST();
    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [Dashboard.init(dashboardConfig), EmailPassword.init(), Session.init()],
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

    return { app, recipeUserId: signUpResponse.user.loginMethods[0].recipeUserId.getAsString() };
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
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

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
