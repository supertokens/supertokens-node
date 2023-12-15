const { addCrossFrameworkTests } = require("../crossFramework.testgen");
let Session = require("../../../recipe/session");
const { extractInfoFromResponse } = require("../../utils");
let assert = require("assert");
const SuperTokens = require("../../..");

addCrossFrameworkTests(
    (setup, callServer, tokenTransferMethod) => {
        describe("Updating token payload multiple times", () => {
            it("should not repeat access token headers", async () => {
                await setup({
                    stConfig: {
                        appInfo: {
                            apiDomain: "http://api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "http://supertokens.io",
                            apiBasePath: "/",
                        },
                        recipeList: [Session.init()],
                    },
                    routes: [
                        {
                            path: "/create",
                            method: "post",
                            handler: async (req, res, _, next) => {
                                await Session.createNewSession(
                                    req,
                                    res,
                                    "public",
                                    SuperTokens.convertToRecipeUserId("id1"),
                                    {},
                                    {}
                                );
                                res.setStatusCode(200);
                                res.sendJSONResponse("");
                                return res.response;
                            },
                        },
                        {
                            path: "/session/multipleMerge",
                            method: "post",
                            verifySession: true,
                            handler: async (req, res, session, _) => {
                                await session.mergeIntoAccessTokenPayload({ test1: Date.now() });
                                await session.mergeIntoAccessTokenPayload({ test2: Date.now() });
                                await session.mergeIntoAccessTokenPayload({ test3: Date.now() });
                                res.setStatusCode(200);
                                res.sendJSONResponse("");
                            },
                        },
                    ],
                });

                const createResp = await callServer({
                    method: "post",
                    path: "/create",
                    headers: {
                        "st-auth-mode": tokenTransferMethod,
                    },
                });
                const info = extractInfoFromResponse(createResp);

                const verifyHeaders =
                    tokenTransferMethod === "header"
                        ? { authorization: `Bearer ${info.accessTokenFromAny}` }
                        : {
                              cookie: `sAccessToken=${encodeURIComponent(info.accessTokenFromAny)}`,
                          };
                if (info.antiCsrf) {
                    verifyHeaders.antiCsrf = info.antiCsrf;
                }

                let resp = await callServer({
                    method: "post",
                    path: "/session/multipleMerge",
                    headers: verifyHeaders,
                });

                const cookieHeader = resp.headers["set-cookie"];
                assert.strictEqual(
                    cookieHeader === undefined
                        ? 0
                        : typeof cookieHeader == "string"
                        ? cookieHeader.startsWith("sAccessToken")
                            ? 1
                            : 0
                        : cookieHeader.filter((c) => c.startsWith("sAccessToken")).length ?? 0,
                    tokenTransferMethod === "cookie" ? 1 : 0
                );
                assert.strictEqual(
                    typeof resp.headers["st-access-token"],
                    tokenTransferMethod === "cookie" ? "undefined" : "string"
                );
                assert.strictEqual(typeof resp.headers["front-token"], "string");
                const exposedHeaders = resp.headers["access-control-expose-headers"].split(" ");
                assert.strictEqual(exposedHeaders.filter((c) => c.includes("front-token")).length, 1);
                assert.strictEqual(
                    exposedHeaders.filter((c) => c.includes("st-access-token")).length,
                    tokenTransferMethod === "cookie" ? 0 : 1
                );
            });
        });
    },
    { allTokenTransferMethods: true }
);
