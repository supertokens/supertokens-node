import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface } from "../../recipe/session";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "../../framework/express";
import NextJS from "../../nextjs";
import { RecipeImplementation as FaunaDBImplementation } from "../../recipe/session/faunadb";
let faunadb = require("faunadb");
import ThirdPartyEmailPassword from "../../recipe/thirdpartyemailpassword";
import ThirdParty from "../../recipe/thirdparty";
import Passwordless from "../../recipe/passwordless";
import ThirdPartyPasswordless from "../../recipe/thirdpartypasswordless";
import UserMetadata from "../../recipe/usermetadata";
import { STMPService as STMPServiceTPP } from "../../recipe/thirdpartypasswordless/emaildelivery";
import { STMPService as STMPServiceP } from "../../recipe/passwordless/emaildelivery";
import { STMPService as STMPServiceTP } from "../../recipe/thirdparty/emaildelivery";
import { STMPService as STMPServiceTPEP } from "../../recipe/thirdpartyemailpassword/emaildelivery";
import { STMPService as STMPServiceEP } from "../../recipe/emailpassword/emaildelivery";
import {
    TwilioService as TwilioServiceTPP,
    SupertokensService as SupertokensServiceTPP,
} from "../../recipe/thirdpartypasswordless/smsdelivery";
import {
    TwilioService as TwilioServiceP,
    SupertokensService as SupertokensServiceP,
} from "../../recipe/thirdpartypasswordless/smsdelivery";

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
    smsDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    return;
                },
            };
        },
    },
    contactMethod: "PHONE",
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
    emailDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    return;
                },
            };
        },
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
    emailDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    return;
                },
            };
        },
    },
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

ThirdPartyPasswordless.init({
    smsDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    return;
                },
            };
        },
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

Passwordless.init({
    contactMethod: "PHONE",
    smsDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    return;
                },
            };
        },
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
    emailDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    return;
                },
            };
        },
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
    emailDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    return;
                },
            };
        },
    },
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

Passwordless.init({
    smsDelivery: {
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    return;
                },
            };
        },
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

ThirdPartyPasswordless.init({
    providers: [
        ThirdPartyPasswordless.Google({
            clientId: "",
            clientSecret: "",
        }),
    ],
    smsDelivery: {
        service: new TwilioServiceTPP({
            twilioSettings: {
                accountSid: "",
                authToken: "",
                from: "",
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawSms: async (input) => {
                        await oI.sendRawSms(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "PASSWORDLESS_LOGIN") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    return await oI.sendSms(input);
                },
            };
        },
    },
    contactMethod: "PHONE",
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
    providers: [
        ThirdPartyPasswordless.Google({
            clientId: "",
            clientSecret: "",
        }),
    ],
    smsDelivery: {
        service: new SupertokensServiceTPP({
            apiKey: "",
        }),
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    return await oI.sendSms(input);
                },
            };
        },
    },
    contactMethod: "PHONE",
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
    emailDelivery: {
        service: new STMPServiceTPP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "EMAIL_VERIFICATION") {
                        } else if (input.type === "PASSWORDLESS_LOGIN") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    if (input.type === "EMAIL_VERIFICATION") {
                    } else if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
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
    emailDelivery: {
        service: new STMPServiceTPP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                };
            },
        }),
    },
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

ThirdPartyPasswordless.init({
    smsDelivery: {
        service: new TwilioServiceTPP({
            twilioSettings: {
                accountSid: "",
                authToken: "",
                from: "",
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawSms: async (input) => {
                        await oI.sendRawSms(input);
                    },
                    getContent: async (input) => {
                        return await oI.getContent(input);
                    },
                };
            },
        }),
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

ThirdPartyPasswordless.init({
    smsDelivery: {
        service: new SupertokensServiceTPP({
            apiKey: "",
        }),
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

Passwordless.init({
    contactMethod: "PHONE",
    smsDelivery: {
        service: new TwilioServiceP({
            twilioSettings: {
                accountSid: "",
                authToken: "",
                from: "",
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawSms: async (input) => {
                        await oI.sendRawSms(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "PASSWORDLESS_LOGIN") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    await oI.sendSms(input);
                },
            };
        },
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
    contactMethod: "PHONE",
    smsDelivery: {
        service: new SupertokensServiceP({
            apiKey: "",
        }),
        override: (oI) => {
            return {
                ...oI,
                sendSms: async (input) => {
                    if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    await oI.sendSms(input);
                },
            };
        },
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
    emailDelivery: {
        service: new STMPServiceP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "PASSWORDLESS_LOGIN") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    if (input.type === "PASSWORDLESS_LOGIN") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
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
    emailDelivery: {
        service: new STMPServiceP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                };
            },
        }),
    },
    contactMethod: "EMAIL",
    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
});

Passwordless.init({
    smsDelivery: {
        service: new TwilioServiceP({
            twilioSettings: {
                accountSid: "",
                authToken: "",
                from: "",
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawSms: async (input) => {
                        await oI.sendRawSms(input);
                    },
                    getContent: async (input) => {
                        return await oI.getContent(input);
                    },
                };
            },
        }),
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

Passwordless.init({
    smsDelivery: {
        service: new SupertokensServiceP({
            apiKey: "",
        }),
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

EmailPassword.init({
    emailDelivery: {
        service: new STMPServiceEP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "EMAIL_VERIFICATION") {
                        } else if (input.type === "PASSWORD_RESET") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    if (input.type === "EMAIL_VERIFICATION") {
                    } else if (input.type === "PASSWORD_RESET") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
    },
});

ThirdPartyEmailPassword.init({
    emailDelivery: {
        service: new STMPServiceTPEP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "EMAIL_VERIFICATION") {
                        } else if (input.type === "PASSWORD_RESET") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    if (input.type === "EMAIL_VERIFICATION") {
                    } else if (input.type === "PASSWORD_RESET") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
    },
});

ThirdParty.init({
    emailDelivery: {
        service: new STMPServiceTP({
            smtpSettings: {
                host: "",
                password: "",
                port: 465,
                from: {
                    name: "",
                    email: "",
                },
            },
            override: (oI) => {
                return {
                    ...oI,
                    sendRawEmail: async (input) => {
                        await oI.sendRawEmail(input);
                    },
                    getContent: async (input) => {
                        if (input.type === "EMAIL_VERIFICATION") {
                        }
                        return await oI.getContent(input);
                    },
                };
            },
        }),
        override: (oI) => {
            return {
                ...oI,
                sendEmail: async (input) => {
                    if (input.type === "EMAIL_VERIFICATION") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
    },
    signInAndUpFeature: {
        providers: [],
    },
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

Supertokens.init(config);

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
                createNewSession: async function (input) {
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        lastTokenRefresh: Date.now(),
                    };
                    return originalImplementation.createNewSession(input);
                },
            };
        },
    },
});
