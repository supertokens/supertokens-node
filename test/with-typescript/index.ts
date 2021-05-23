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
import { RecipeImplementation as FaunaDBImplementation } from "../../recipe/session/faunadb";
let faunadb = require("faunadb");

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
                        createNewSession: async (res, userId, jwtPayload, sessionData) => {
                            let session = await originalImpl.createNewSession(res, userId);
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
                    return new FaunaDBImplementation(originalImpl, {
                        faunaDBClient: new faunadb(),
                        userCollectionName: "users",
                    });
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
                        emailExistsGET: async (email, option) => {
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
