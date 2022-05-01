const { ProcessState } = require("../../lib/build/processState");
const {createServer, request} = require('http');
const { default: SuperTokens } = require("../../lib/build/supertokens");
const { killAllST, setupST, cleanST, startST, extractInfoFromResponse, printPath } = require("../utils")
const Session = require("../../recipe/session");
const { createApp, createRouter } = require("h3");
const { middleware } = require("../../lib/build/framework/h3");
const { assert } = require("console");
describe(`h3: ${printPath("[test/framework/h3.test.js]")}`, function () {
    beforeEach(async function() {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    })

    after(async function() {
        await killAllST();
        await cleanST();
    })

    it("test that if disabling api, the default refresh API does not work", async function() {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io"
            },
            recipeList: [
                Session.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                refreshPOST: undefined,
                            };
                        },
                    },
                    antiCsrf: "VIA_TOKEN",
                })
            ]
        })
        const app = createApp();
        const router = createRouter();
        router.post('/create', async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            return "";
        })
        app.use(router);
        app.use(middleware());
        const server = createServer(app);
        let res = extractInfoFromResponse(
            await new Promise((resolve) => {
                request(server)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if(err) {
                            resolve(undefined)
                        } else {
                            resolve(res);
                        }
                    })
            })
        )

        let res2 = await new Promise((resolve) => {
            request(server)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        })
        assert(res2.status === 404);
    })
})