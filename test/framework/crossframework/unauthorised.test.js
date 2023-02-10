const { addCrossFrameworkTests } = require("../crossFramework.testgen");
let Session = require("../../../recipe/session");
const { extractInfoFromResponse } = require("../../utils");
let assert = require("assert");

addCrossFrameworkTests(
    (setup, callServer, tokenTransferMethod) => {
        describe("Throwing UNATHORISED", () => {
            it("should clear all response cookies during refresh", async () => {
                await setup({
                    stConfig: {
                        supertokens: {
                            connectionURI: "http://localhost:8080",
                        },
                        appInfo: {
                            apiDomain: "http://api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "http://supertokens.io",
                            apiBasePath: "/",
                        },
                        recipeList: [
                            Session.init({
                                antiCsrf: "VIA_TOKEN",
                                override: {
                                    apis: (oI) => {
                                        return {
                                            ...oI,
                                            refreshPOST: async function (input) {
                                                await oI.refreshPOST(input);
                                                throw new Session.Error({
                                                    message: "unauthorised",
                                                    type: Session.Error.UNAUTHORISED,
                                                    clearTokens: true,
                                                });
                                            },
                                        };
                                    },
                                },
                            }),
                        ],
                    },
                    routes: [
                        {
                            path: "/create",
                            method: "post",
                            handler: async (req, res, next) => {
                                await Session.createNewSession(req, res, "id1", {}, {});
                                res.setStatusCode(200);
                                res.sendJSONResponse("");
                                return res.response;
                            },
                        },
                    ],
                });

                let res = extractInfoFromResponse(
                    await callServer({
                        method: "post",
                        path: "/create",
                        headers: {
                            "st-auth-mode": tokenTransferMethod,
                        },
                    })
                );

                assert.notStrictEqual(res.accessTokenFromAny, undefined);
                assert.notStrictEqual(res.refreshTokenFromAny, undefined);

                const refreshHeaders =
                    tokenTransferMethod === "header"
                        ? { authorization: `Bearer ${res.refreshTokenFromAny}` }
                        : {
                              cookie: `sRefreshToken=${encodeURIComponent(
                                  res.refreshTokenFromAny
                              )}; sIdRefreshToken=asdf`,
                          };
                if (res.antiCsrf) {
                    refreshHeaders.antiCsrf = res.antiCsrf;
                }

                let resp = await callServer({
                    method: "post",
                    path: "/session/refresh",
                    headers: refreshHeaders,
                });

                let res2 = extractInfoFromResponse(resp);

                assert.strictEqual(res2.status, 401);
                if (tokenTransferMethod === "cookie") {
                    assert.strictEqual(res2.accessToken, "");
                    assert.strictEqual(res2.refreshToken, "");
                    assert.strictEqual(res2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res2.accessTokenDomain, undefined);
                    assert.strictEqual(res2.refreshTokenDomain, undefined);
                } else {
                    assert.strictEqual(res2.accessTokenFromHeader, "");
                    assert.strictEqual(res2.refreshTokenFromHeader, "");
                }
                assert.strictEqual(res2.frontToken, "remove");
                assert.strictEqual(res2.antiCsrf, undefined);
            });

            it("test revoking a session after createNewSession with throwing unauthorised error", async function () {
                await setup({
                    stConfig: {
                        supertokens: {
                            connectionURI: "http://localhost:8080",
                        },
                        appInfo: {
                            apiDomain: "http://api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "http://supertokens.io",
                            apiBasePath: "/",
                        },
                        recipeList: [
                            Session.init({
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    },
                    routes: [
                        {
                            path: "/create-throw",
                            method: "post",
                            handler: async (req, res, next) => {
                                await Session.createNewSession(req, res, "id1", {}, {});
                                next(
                                    new Session.Error({
                                        message: "unauthorised",
                                        type: Session.Error.UNAUTHORISED,
                                    })
                                );
                            },
                        },
                    ],
                });

                let res = extractInfoFromResponse(
                    await callServer({
                        method: "post",
                        path: "/create-throw",
                        headers: {
                            "st-auth-mode": tokenTransferMethod,
                        },
                    })
                );

                assert.strictEqual(res.status, 401);
                if (tokenTransferMethod === "cookie") {
                    assert.strictEqual(res.accessToken, "");
                    assert.strictEqual(res.refreshToken, "");
                    assert.strictEqual(res.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(res.accessTokenDomain, undefined);
                    assert.strictEqual(res.refreshTokenDomain, undefined);
                } else {
                    assert.strictEqual(res.accessTokenFromHeader, "");
                    assert.strictEqual(res.refreshTokenFromHeader, "");
                }
                assert.strictEqual(res.frontToken, "remove");
                assert.strictEqual(res.antiCsrf, undefined);
            });
        });
    },
    { allTokenTransferMethods: true }
);
