import express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, VerifySessionOptions, SessionContainer, SessionRequest } from "../../recipe/session";
import EmailPassword, { RecipeInterface as EPRecipeInterface } from "../../recipe/emailpassword";
import NextJS from "../../nextjs";
import {
    RecipeImplementation as FaunaDBImplementation,
    SessionContainer as FaunaDBSessionContainer,
} from "../../recipe/session/faunadb";
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
                            let userId = input.userId;

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
                        emailExistsGET: async (input) => {
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

                        return response;
                    }
                },
            };
        },
    },
});

async function f() {
    let n: number = await Supertokens.getUserCount(["a", "b"]);
    let n2: number = await Supertokens.getUserCount();

    await Supertokens.getUsersNewestFirst({
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
