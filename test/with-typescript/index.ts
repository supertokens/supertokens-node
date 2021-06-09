import express from "express";
import Supertokens from "../..";
import Session, {
    RecipeInterface,
    VerifySessionOptions,
    SessionContainer,
    SessionRequest,
    RecipeImplementation as SessionRecipeImplementation,
} from "../../recipe/session";
import EmailPassword, {
    RecipeInterface as EPRecipeInterface,
    RecipeImplementation as EPRecipeImplementation,
} from "../../recipe/emailpassword";
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
                functions: (originalImpl: SessionRecipeImplementation) => {
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
        Session.init(),
        EmailPassword.init({
            override: {
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
