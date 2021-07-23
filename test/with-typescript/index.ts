import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, SessionRequest } from "../../recipe/session";
import EmailPassword from "../../recipe/emailpassword";
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
                                getJWTPayload: session.getJWTPayload,
                                getSessionData: session.getSessionData,
                                getUserId: session.getUserId,
                                revokeSession: session.revokeSession,
                                updateJWTPayload: session.updateJWTPayload,
                                updateSessionData: session.updateSessionData,
                            };
                        },
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
        EmailPassword.init({
            override: {},
        }),
    ],
});

app.use(Supertokens.middleware());

app.use(
    Session.verifySession({
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
            async (_: express.NextFunction) => {
                return await Session.getSession(req, res);
            },
            req,
            res
        );
        if (session2 !== undefined) {
            session2.getHandle();
        }

        await NextJS.superTokensNextWrapper(
            async (next: express.NextFunction) => {
                await Supertokens.middleware()(req, res, next);
            },
            req,
            res
        );
    }
);

app.use(Supertokens.errorHandler());

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
                            input.jwtPayload = {
                                ...input.jwtPayload,
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
                        getUserCount: async () => {
                            let supertokensCount = await supertokensImpl.getUserCount();
                            let yourUsersCount = 0; // TODO: fetch the count from your db
                            return yourUsersCount + supertokensCount;
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
                signInUpPOST: async (input) => {
                    if (oI.signInUpPOST === undefined) {
                        throw Error("original implementation of signInUpPOST API is undefined");
                    }
                    if (input.type === "emailpassword") {
                        let email = input.formFields.filter((i) => i.id === "email")[0];
                    }
                    let response = await oI.signInUpPOST(input);
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

                    let origin = options.req.headers["origin"];

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
