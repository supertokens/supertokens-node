"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const __1 = require("../..");
const session_1 = require("../../recipe/session");
const emailpassword_1 = require("../../recipe/emailpassword");
const nextjs_1 = require("../../nextjs");
const faunadb_1 = require("../../recipe/session/faunadb");
let faunadb = require("faunadb");
const thirdpartyemailpassword_1 = require("../../recipe/thirdpartyemailpassword");
let app = express();
__1.default.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        session_1.default.init({
            antiCsrf: "NONE",
            cookieDomain: "",
            override: {
                functions: (originalImpl) => {
                    return {
                        getSession: originalImpl.getSession,
                        createNewSession: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                let session = yield originalImpl.createNewSession(input);
                                return {
                                    getAccessToken: session.getAccessToken,
                                    getHandle: session.getHandle,
                                    getJWTPayload: session.getJWTPayload,
                                    getSessionData: session.getSessionData,
                                    getUserId: session.getUserId,
                                    revokeSession: session.revokeSession,
                                    updateJWTPayload: session.updateJWTPayload,
                                    updateSessionData: session.updateSessionData,
                                };
                            }),
                        getAllSessionHandlesForUser: originalImpl.getAllSessionHandlesForUser,
                        getJWTPayload: originalImpl.getJWTPayload,
                        getSessionData: originalImpl.getSessionData,
                        refreshSession: originalImpl.refreshSession,
                        revokeAllSessionsForUser: originalImpl.revokeAllSessionsForUser,
                        revokeMultipleSessions: originalImpl.revokeMultipleSessions,
                        revokeSession: originalImpl.revokeSession,
                        updateJWTPayload: originalImpl.updateJWTPayload,
                        updateSessionData: originalImpl.updateSessionData,
                        getAccessTokenLifeTimeMS: originalImpl.getAccessTokenLifeTimeMS,
                        getRefreshTokenLifeTimeMS: originalImpl.getRefreshTokenLifeTimeMS,
                    };
                },
            },
        }),
        emailpassword_1.default.init({
            override: {},
        }),
    ],
});
app.use(__1.default.middleware());
app.use(
    session_1.default.verifySession({
        antiCsrfCheck: true,
        sessionRequired: false,
    }),
    (req, res) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let session = req.session;
            if (session !== undefined) {
                session.getAccessToken();
            }
            // nextJS types
            let session2 = yield nextjs_1.default.superTokensNextWrapper(
                (_) =>
                    __awaiter(void 0, void 0, void 0, function* () {
                        return yield session_1.default.getSession(req, res);
                    }),
                req,
                res
            );
            if (session2 !== undefined) {
                session2.getHandle();
            }
            yield nextjs_1.default.superTokensNextWrapper(
                (next) =>
                    __awaiter(void 0, void 0, void 0, function* () {
                        yield __1.default.middleware()(req, res, next);
                    }),
                req,
                res
            );
        })
);
app.use(__1.default.errorHandler());
app.listen();
__1.default.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        session_1.default.init({
            antiCsrf: "NONE",
            cookieDomain: "",
            override: {
                functions: (originalImpl) => {
                    let faunaDBMod = new faunadb_1.RecipeImplementation(originalImpl, {
                        faunaDBClient: new faunadb(),
                        userCollectionName: "users",
                    });
                    return Object.assign(Object.assign({}, faunaDBMod), {
                        createNewSession: (input) => {
                            return faunaDBMod.createNewSession(input);
                        },
                    });
                },
            },
        }),
        emailpassword_1.default.init({
            override: {},
        }),
    ],
    supertokens: {
        connectionURI: "",
    },
});
__1.default.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        session_1.default.init({
            override: {
                functions: (originalImplementation) => {
                    return Object.assign(Object.assign({}, originalImplementation), {
                        createNewSession: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                input.jwtPayload = Object.assign(Object.assign({}, input.jwtPayload), {
                                    someKey: "someValue",
                                });
                                input.sessionData = Object.assign(Object.assign({}, input.sessionData), {
                                    someKey: "someValue",
                                });
                                return originalImplementation.createNewSession(input);
                            }),
                    });
                },
            },
        }),
        emailpassword_1.default.init({
            override: {
                functions: (supertokensImpl) => {
                    return Object.assign(Object.assign({}, supertokensImpl), {
                        signIn: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                // we check if the email exists in SuperTokens. If not,
                                // then the sign in should be handled by you.
                                if ((yield supertokensImpl.getUserByEmail({ email: input.email })) === undefined) {
                                    // TODO: sign in from your db
                                    // example return value if credentials don't match
                                    return {
                                        status: "WRONG_CREDENTIALS_ERROR",
                                    };
                                } else {
                                    return supertokensImpl.signIn(input);
                                }
                            }),
                        signUp: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                // all new users are created in SuperTokens;
                                return supertokensImpl.signUp(input);
                            }),
                        getUserByEmail: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                let superTokensUser = yield supertokensImpl.getUserByEmail(input);
                                if (superTokensUser === undefined) {
                                    let email = input.email;
                                    // TODO: fetch and return user info from your database...
                                } else {
                                    return superTokensUser;
                                }
                            }),
                        getUserById: (input) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                let superTokensUser = yield supertokensImpl.getUserById(input);
                                if (superTokensUser === undefined) {
                                    let userId = input.userId;
                                    // TODO: fetch and return user info from your database...
                                } else {
                                    return superTokensUser;
                                }
                            }),
                        getUserCount: () =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                let supertokensCount = yield supertokensImpl.getUserCount();
                                let yourUsersCount = 0; // TODO: fetch the count from your db
                                return yourUsersCount + supertokensCount;
                            }),
                    });
                },
                apis: (oI) => {
                    return Object.assign(Object.assign({}, oI), {
                        emailExistsGET: (_) =>
                            __awaiter(void 0, void 0, void 0, function* () {
                                return {
                                    status: "OK",
                                    exists: true,
                                };
                            }),
                    });
                },
            },
        }),
    ],
    supertokens: {
        connectionURI: "",
    },
});
thirdpartyemailpassword_1.default.init({
    override: {
        apis: (oI) => {
            return Object.assign(Object.assign({}, oI), {
                signInUpPOST: (input) =>
                    __awaiter(void 0, void 0, void 0, function* () {
                        let response = yield oI.signInUpPOST(input);
                        if (response.status === "OK") {
                            let { id, email } = response.user;
                            let newUser = response.createdNewUser;
                            // newUser is a boolean value, if true, then the user has signed up, else they have signed in.
                            if (response.type === "thirdparty") {
                                // this is the response from the OAuth 2 provider that contains their tokens or user info.
                                let thirdPartyAuthCodeResponse = response.authCodeResponse;
                            }
                            if (input.type === "emailpassword") {
                                // these are the input form fields values that the user used while signing up / in
                                let formFields = input.formFields;
                            }
                            if (newUser) {
                                // TODO: post sign up logic
                            } else {
                                // TODO: post sign in logic
                            }
                        }
                        return response;
                    }),
            });
        },
    },
});
function f() {
    return __awaiter(this, void 0, void 0, function* () {
        let n = yield __1.default.getUserCount(["a", "b"]);
        let n2 = yield __1.default.getUserCount();
        yield __1.default.getUsersOldestFirst({
            includeRecipeIds: [""],
            limit: 1,
            paginationToken: "",
        });
        yield __1.default.getUsersNewestFirst({
            includeRecipeIds: [""],
            limit: 1,
            paginationToken: "",
        });
    });
}
emailpassword_1.default.init({
    override: {
        apis: (originalImplementation) => {
            return Object.assign(Object.assign({}, originalImplementation), {
                signInPOST: (input) =>
                    __awaiter(void 0, void 0, void 0, function* () {
                        let formFields = input.formFields;
                        let options = input.options;
                        let email = formFields.filter((f) => f.id === "email")[0].value;
                        let password = formFields.filter((f) => f.id === "password")[0].value;
                        let response = yield options.recipeImplementation.signIn({ email, password });
                        if (response.status === "WRONG_CREDENTIALS_ERROR") {
                            return response;
                        }
                        let user = response.user;
                        let origin = options.req.headers["origin"];
                        let isAllowed = false; // TODO: check if this user is allowed to sign in via their origin..
                        if (isAllowed) {
                            // import Session from "supertokens-node/recipe/session"
                            yield session_1.default.createNewSession(options.res, user.id);
                            return {
                                status: "OK",
                                user,
                            };
                        } else {
                            // on the frontend, this will display incorrect email / password combination
                            return {
                                status: "WRONG_CREDENTIALS_ERROR",
                            };
                        }
                    }),
            });
        },
    },
});
//# sourceMappingURL=index.js.map
