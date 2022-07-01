import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, SessionClaimValidator } from "../../recipe/session";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "../../framework/express";
import NextJS from "../../nextjs";
import { RecipeImplementation as FaunaDBImplementation } from "../../recipe/session/faunadb";
let faunadb = require("faunadb");
import ThirdPartyEmailPassword from "../../recipe/thirdpartyemailpassword";
import Passwordless from "../../recipe/passwordless";
import ThirdPartyPasswordless from "../../recipe/thirdpartypasswordless";
import UserMetadata from "../../recipe/usermetadata";
import { BooleanClaim, PrimitiveClaim, SessionClaim } from "../../recipe/session/claims";

UserMetadata.updateUserMetadata("...", {
    firstName: "..",
    someObj: {
        someKey: "...",
        someArr: ["hello"],
    },
});

UserMetadata.getUserMetadata("xyz").then((data) => {
    let firstName: string = data.metadata.firstName;
    console.log(firstName);
});

ThirdPartyPasswordless.init({
    providers: [
        ThirdPartyPasswordless.Google({
            clientId: "",
            clientSecret: "",
        }),
    ],
    contactMethod: "PHONE",
    createAndSendCustomTextMessage: async (input, userCtx) => {
        return;
    },
    flowType: "MAGIC_LINK",
    getCustomUserInputCode: (userCtx) => {
        return "123";
    },
    getLinkDomainAndPath: (contactInfo, userCtx) => {
        return "";
    },
    override: {
        apis: (oI) => {
            return {
                ...oI,
            };
        },
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                consumeCode: async function (input) {
                    // TODO: some custom logic

                    // or call the default behaviour as show below
                    return await originalImplementation.consumeCode(input);
                },
            };
        },
    },
});

ThirdPartyPasswordless.init({
    contactMethod: "EMAIL",
    createAndSendCustomEmail: async (input, userCtx) => {
        return;
    },
    flowType: "USER_INPUT_CODE",
    getCustomUserInputCode: async (userCtx) => {
        return "123";
    },
    getLinkDomainAndPath: async (contactInfo, userCtx) => {
        return "";
    },
    override: {
        apis: (oI) => {
            return {
                ...oI,
            };
        },
    },
});

ThirdPartyPasswordless.init({
    createAndSendCustomEmail: async function (input) {},
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

ThirdPartyPasswordless.init({
    createAndSendCustomTextMessage: async function (input) {},
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

Passwordless.init({
    contactMethod: "PHONE",
    createAndSendCustomTextMessage: async (input, userCtx) => {
        return;
    },
    flowType: "MAGIC_LINK",
    getCustomUserInputCode: (userCtx) => {
        return "123";
    },
    getLinkDomainAndPath: (contactInfo, userCtx) => {
        return "";
    },
    override: {
        apis: (oI) => {
            return {
                ...oI,
            };
        },
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                consumeCode: async function (input) {
                    // TODO: some custom logic

                    // or call the default behaviour as show below
                    return await originalImplementation.consumeCode(input);
                },
            };
        },
    },
});

Passwordless.init({
    contactMethod: "EMAIL",
    createAndSendCustomEmail: async (input, userCtx) => {
        return;
    },
    flowType: "USER_INPUT_CODE",
    getCustomUserInputCode: async (userCtx) => {
        return "123";
    },
    getLinkDomainAndPath: async (contactInfo, userCtx) => {
        return "";
    },
    override: {
        apis: (oI) => {
            return {
                ...oI,
            };
        },
    },
});

Passwordless.init({
    createAndSendCustomEmail: async function (input) {},
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

Passwordless.init({
    createAndSendCustomTextMessage: async function (input) {},
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});
import { TypeInput } from "../../types";
import { TypeInput as SessionTypeInput } from "../../recipe/session/types";
import { TypeInput as EPTypeInput } from "../../recipe/emailpassword/types";

let app = express();
let sessionConfig: SessionTypeInput = {
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
                        mergeIntoAccessTokenPayload: session.mergeIntoAccessTokenPayload,
                        assertClaims: session.assertClaims,
                        fetchAndGetAccessTokenPayloadUpdate: session.fetchAndGetAccessTokenPayloadUpdate,
                        setClaimValue: session.setClaimValue,
                        getClaimValue: session.getClaimValue,
                        removeClaim: session.removeClaim,
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
                regenerateAccessToken: originalImpl.regenerateAccessToken,
                mergeIntoAccessTokenPayload: originalImpl.mergeIntoAccessTokenPayload,
                getGlobalClaimValidators: originalImpl.getGlobalClaimValidators,
                fetchAndGetAccessTokenPayloadUpdate: originalImpl.fetchAndGetAccessTokenPayloadUpdate,
                setClaimValue: originalImpl.setClaimValue,
                getClaimValue: originalImpl.getClaimValue,
                removeClaim: originalImpl.removeClaim,
            };
        },
    },
};

let epConfig: EPTypeInput = {
    override: {},
};

let config: TypeInput = {
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [Session.init(sessionConfig), EmailPassword.init(epConfig)],
    isInServerlessEnv: true,
    framework: "express",
    supertokens: {
        connectionURI: "",
        apiKey: "",
    },
    telemetry: true,
};

class StringClaim extends PrimitiveClaim<string> {
    constructor(key: string) {
        super({ key, fetchValue: (userId) => userId });

        this.validators = {
            ...this.validators,
            startsWith: (str) => ({
                claim: this,
                id: key,
                shouldRefetch: () => false,
                validate: (payload) => {
                    const value = this.getValueFromPayload(payload);
                    if (!value || !value.startsWith(str)) {
                        return {
                            isValid: false,
                            reason: {
                                expectedPrefix: str,
                                value,
                                message: "wrong prefix",
                            },
                        };
                    }
                    return { isValid: true };
                },
            }),
        };
    }

    validators: PrimitiveClaim<string>["validators"] & {
        startsWith: (prefix: string) => SessionClaimValidator;
    };
}
const stringClaim = new StringClaim("cust-str");
const boolClaim = new BooleanClaim({ key: "asdf", fetchValue: (userId) => userId.startsWith("5") });

Supertokens.init(config);

app.use(middleware());

app.use(
    verifySession({
        antiCsrfCheck: true,
        sessionRequired: false,
        overrideGlobalClaimValidators: (session, globalClaimValidators) => {
            return [...globalClaimValidators, stringClaim.validators.startsWith("5")];
        },
    }),
    async (req: SessionRequest, res) => {
        let session = req.session;
        if (session !== undefined) {
            session.getAccessToken();
            const oldValue = await session.getClaimValue(stringClaim);
            await session.setClaimValue(stringClaim, oldValue + "!!!!");
            await session.removeClaim(boolClaim);
            await session.fetchAndGetAccessTokenPayloadUpdate(boolClaim);

            await session.assertClaims([
                stringClaim.validators.startsWith("!!!!"),
                boolClaim.validators.hasValue(true),
            ]);
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
            const handle = session2.getHandle();
            await Session.fetchAndGetAccessTokenPayloadUpdate(handle, boolClaim);
            const oldValue = await Session.getClaimValue(handle, stringClaim);
            await Session.setClaimValue(handle, stringClaim, oldValue + "!!!");
            await Session.removeClaim(handle, boolClaim);
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
                            if (
                                (await supertokensImpl.getUserByEmail({
                                    email: input.email,
                                    userContext: input.userContext,
                                })) === undefined
                            ) {
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

Session.init({
    jwt: {
        enable: true,
        propertyNameInAccessTokenPayload: "someKey",
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

                    let response = await options.recipeImplementation.signIn({
                        email,
                        password,
                        userContext: input.userContext,
                    });
                    if (response.status === "WRONG_CREDENTIALS_ERROR") {
                        return response;
                    }
                    let user = response.user;

                    let origin = options.req["origin"];

                    let isAllowed = false; // TODO: check if this user is allowed to sign in via their origin..

                    if (isAllowed) {
                        // import Session from "supertokens-node/recipe/session"
                        let session = await Session.createNewSession(options.res, user.id);
                        return {
                            status: "OK",
                            session,
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

Session.init({
    override: {
        functions: (originalImplementation) => {
            return {
                ...originalImplementation,
                refreshSession: async function (input) {
                    let session = await originalImplementation.refreshSession(input);

                    let currAccessTokenPayload = session.getAccessTokenPayload();

                    await session.updateAccessTokenPayload({
                        ...currAccessTokenPayload,
                        lastTokenRefresh: Date.now(),
                    });

                    return session;
                },
                getGlobalClaimValidators: ({ claimValidatorsAddedByOtherRecipes }) => [
                    ...claimValidatorsAddedByOtherRecipes,
                    boolClaim.validators.hasValue(true),
                ],
                createNewSession: async function (input) {
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        lastTokenRefresh: Date.now(),
                    };
                    input.accessTokenPayload = stringClaim.removeFromPayload(input.accessTokenPayload);
                    input.accessTokenPayload = boolClaim.fetchAndGetAccessTokenPayloadUpdate(
                        input.userId,
                        input.accessTokenPayload
                    );
                    return originalImplementation.createNewSession(input);
                },
            };
        },
    },
});
