import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, SessionRequest } from "../../recipe/session";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler } from "../../framework/express";
import NextJS from "../../nextjs";
import { RecipeImplementation as FaunaDBImplementation } from "../../recipe/session/faunadb";
let faunadb = require("faunadb");
import ThirdPartyEmailPassword from "../../recipe/thirdpartyemailpassword";

let app = express();

Supertokens.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        Session.init({
            antiCsrf: "NONE",
            cookieDomain: "",
            override: {
                functions: (originalImpl: RecipeInterface) => {
                    return {
                        getSession: originalImpl.getSession,
                        createNewSession: async (input) => {
                            let session = await originalImpl.createNewSession(input);
                            return {
                                getAccessToken: session.getAccessToken,
                                getHandle: session.getHandle,
                                getAccessTokenPayload: session.getAccessTokenPayload,
                                getSessionData: session.getSessionData,
                                getUserId: session.getUserId,
                                revokeSession: session.revokeSession,
                                updateAccessTokenPayload: session.updateAccessTokenPayload,
                                updateSessionData: session.updateSessionData,
                                getExpiry: session.getExpiry,
                                getTimeCreated: session.getTimeCreated,
                            };
                        },
                        getAllSessionHandlesForUser: originalImpl.getAllSessionHandlesForUser,
                        refreshSession: originalImpl.refreshSession,
                        revokeAllSessionsForUser: originalImpl.revokeAllSessionsForUser,
                        revokeMultipleSessions: originalImpl.revokeMultipleSessions,
                        revokeSession: originalImpl.revokeSession,
                        updateAccessTokenPayload: originalImpl.updateAccessTokenPayload,
                        updateSessionData: originalImpl.updateSessionData,
                        getAccessTokenLifeTimeMS: originalImpl.getAccessTokenLifeTimeMS,
                        getRefreshTokenLifeTimeMS: originalImpl.getRefreshTokenLifeTimeMS,
                        getSessionInformation: originalImpl.getSessionInformation,
                    };
                },
            },
        }),
        EmailPassword.init({
            override: {},
        }),
    ],
    isInServerlessEnv: true,
    framework: "express",
    supertokens: {
        connectionURI: "",
        apiKey: "",
    },
    telemetry: true,
});

app.use(middleware());

app.use(
    verifySession({
        antiCsrfCheck: true,
        sessionRequired: false,
    }),
    async (req: SessionRequest, res) => {
        let session = req.session;
        if (session !== undefined) {
            session.getAccessToken();
        }

        // nextJS types
        let session2 = await NextJS.superTokensNextWrapper(
            async (next) => {
                return await Session.getSession(req, res);
            },
            req,
            res
        );
        if (session2 !== undefined) {
            session2.getHandle();
        }

        await NextJS.superTokensNextWrapper(
            async (next) => {
                await middleware()(req, res, next);
            },
            req,
            res
        );
    }
);

app.use(verifySession(), async (req: SessionRequest, res) => {
    let session = req.session;
    if (session === undefined) {
        throw Error("this error should not get thrown");
    }
    res.json({
        userId: session.getUserId(),
    });
});

app.use(errorHandler());

app.listen();

Supertokens.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        Session.init({
            antiCsrf: "NONE",
            cookieDomain: "",
            override: {
                functions: (originalImpl: RecipeInterface) => {
                    let faunaDBMod = new FaunaDBImplementation(originalImpl, {
                        faunaDBClient: new faunadb(),
                        userCollectionName: "users",
                    });
                    return {
                        ...faunaDBMod,
                        createNewSession: (input) => {
                            return faunaDBMod.createNewSession(input);
                        },
                    };
                },
            },
        }),
        EmailPassword.init({
            override: {},
        }),
    ],
    supertokens: {
        connectionURI: "",
    },
});

Supertokens.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        Session.init({
            override: {
                functions: (originalImplementation) => {
                    return {
                        ...originalImplementation,
                        createNewSession: async (input) => {
                            input.accessTokenPayload = {
                                ...input.accessTokenPayload,
                                someKey: "someValue",
                            };

                            input.sessionData = {
                                ...input.sessionData,
                                someKey: "someValue",
                            };

                            return originalImplementation.createNewSession(input);
                        },
                    };
                },
            },
        }),
        EmailPassword.init({
            override: {
                functions: (supertokensImpl) => {
                    return {
                        ...supertokensImpl,
                        signIn: async (input) => {
                            // we check if the email exists in SuperTokens. If not,
                            // then the sign in should be handled by you.
                            if ((await supertokensImpl.getUserByEmail({ email: input.email })) === undefined) {
                                // TODO: sign in from your db
                                // example return value if credentials don't match
                                return {
                                    status: "WRONG_CREDENTIALS_ERROR",
                                };
                            } else {
                                return supertokensImpl.signIn(input);
                            }
                        },
                        signUp: async (input) => {
                            // all new users are created in SuperTokens;
                            return supertokensImpl.signUp(input);
                        },
                        getUserByEmail: async (input) => {
                            let superTokensUser = await supertokensImpl.getUserByEmail(input);
                            if (superTokensUser === undefined) {
                                let email = input.email;
                                // TODO: fetch and return user info from your database...
                            } else {
                                return superTokensUser;
                            }
                        },
                        getUserById: async (input) => {
                            let superTokensUser = await supertokensImpl.getUserById(input);
                            if (superTokensUser === undefined) {
                                let userId = input.userId;
                                // TODO: fetch and return user info from your database...
                            } else {
                                return superTokensUser;
                            }
                        },
                    };
                },
                apis: (oI) => {
                    return {
                        ...oI,
                        emailExistsGET: async (_) => {
                            return {
                                status: "OK",
                                exists: true,
                            };
                        },
                    };
                },
            },
        }),
    ],
    supertokens: {
        connectionURI: "",
    },
});

ThirdPartyEmailPassword.init({
    override: {
        apis: (oI) => {
            return {
                ...oI,
                thirdPartySignInUpPOST: async (input) => {
                    if (oI.thirdPartySignInUpPOST === undefined) {
                        throw Error("original implementation of thirdPartySignInUpPOST API is undefined");
                    }
                    return oI.thirdPartySignInUpPOST(input);
                },
                emailPasswordSignInPOST: async (input) => {
                    if (oI.emailPasswordSignInPOST === undefined) {
                        throw Error("original implementation of emailPasswordSignInPOST API is undefined");
                    }
                    return oI.emailPasswordSignInPOST(input);
                },
                emailPasswordSignUpPOST: async (input) => {
                    if (oI.emailPasswordSignUpPOST === undefined) {
                        throw Error("original implementation of emailPasswordSignUpPOST API is undefined");
                    }
                    return oI.emailPasswordSignUpPOST(input);
                },
            };
        },
    },
});

async function f() {
    let n: number = await Supertokens.getUserCount(["a", "b"]);
    let n2: number = await Supertokens.getUserCount();

    await Supertokens.getUsersOldestFirst({
        includeRecipeIds: [""],
        limit: 1,
        paginationToken: "",
    });

    await Supertokens.getUsersNewestFirst({
        includeRecipeIds: [""],
        limit: 1,
        paginationToken: "",
    });
}

EmailPassword.init({
    override: {
        apis: (originalImplementation) => {
            return {
                ...originalImplementation,
                signInPOST: async (input) => {
                    let formFields = input.formFields;
                    let options = input.options;
                    let email = formFields.filter((f) => f.id === "email")[0].value;
                    let password = formFields.filter((f) => f.id === "password")[0].value;

                    let response = await options.recipeImplementation.signIn({ email, password });
                    if (response.status === "WRONG_CREDENTIALS_ERROR") {
                        return response;
                    }
                    let user = response.user;

                    let origin = options.req["origin"];

                    let isAllowed = false; // TODO: check if this user is allowed to sign in via their origin..

                    if (isAllowed) {
                        // import Session from "supertokens-node/recipe/session"
                        await Session.createNewSession(options.res, user.id);
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
                },
            };
        },
    },
});
