import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, SessionClaimValidator } from "../../recipe/session";
import EmailVerification from "../../recipe/emailverification";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "../../framework/express";
import NextJS from "../../nextjs";
import ThirdPartyEmailPassword from "../../recipe/thirdpartyemailpassword";
import ThirdParty from "../../recipe/thirdparty";
import Passwordless from "../../recipe/passwordless";
import ThirdPartyPasswordless from "../../recipe/thirdpartypasswordless";
import { SMTPService as SMTPServiceTPP } from "../../recipe/thirdpartypasswordless/emaildelivery";
import { SMTPService as SMTPServiceP } from "../../recipe/passwordless/emaildelivery";
import { SMTPService as SMTPServiceTPEP } from "../../recipe/thirdpartyemailpassword/emaildelivery";
import { SMTPService as SMTPServiceEP } from "../../recipe/emailpassword/emaildelivery";
import {
    TwilioService as TwilioServiceTPP,
    SupertokensService as SupertokensServiceTPP,
} from "../../recipe/thirdpartypasswordless/smsdelivery";
import {
    TwilioService as TwilioServiceP,
    SupertokensService as SupertokensServiceP,
} from "../../recipe/thirdpartypasswordless/smsdelivery";
import UserMetadata from "../../recipe/usermetadata";
import { BooleanClaim, PrimitiveClaim, SessionClaim } from "../../recipe/session/claims";
import UserRoles from "../../recipe/userroles";
import Dashboard from "../../recipe/dashboard";
import JWT from "../../recipe/jwt";

UserRoles.init({
    override: {
        apis: (oI) => {
            return {
                ...oI,
            };
        },
        functions: (oI) => {
            return {
                ...oI,
                addRoleToUser: async function (input) {
                    return oI.addRoleToUser({
                        role: input.role,
                        userContext: input.userContext,
                        userId: input.userId,
                    });
                },
                createNewRoleOrAddPermissions: async function (input) {
                    return oI.createNewRoleOrAddPermissions({
                        permissions: input.permissions,
                        role: input.role,
                        userContext: input.userContext,
                    });
                },
                deleteRole: async function (input) {
                    return oI.deleteRole({
                        role: input.role,
                        userContext: input.userContext,
                    });
                },
                getAllRoles: async function (input) {
                    return oI.getAllRoles({
                        userContext: input.userContext,
                    });
                },
                getPermissionsForRole: async function (input) {
                    return oI.getPermissionsForRole({
                        role: input.role,
                        userContext: input.userContext,
                    });
                },
                getRolesForUser: async function (input) {
                    return oI.getRolesForUser({
                        userContext: input.userContext,
                        userId: input.userId,
                    });
                },
                getRolesThatHavePermission: async function (input) {
                    return oI.getRolesThatHavePermission({
                        permission: input.permission,
                        userContext: input.userContext,
                    });
                },
                getUsersThatHaveRole: async function (input) {
                    return oI.getUsersThatHaveRole({
                        role: input.role,
                        userContext: input.userContext,
                    });
                },
                removePermissionsFromRole: async function (input) {
                    return oI.removePermissionsFromRole({
                        permissions: input.permissions,
                        role: input.role,
                        userContext: input.userContext,
                    });
                },
                removeUserRole: async function (input) {
                    return oI.removeUserRole({
                        role: input.role,
                        userContext: input.userContext,
                        userId: input.userId,
                    });
                },
            };
        },
    },
});

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
        {
            config: {
                thirdPartyId: "google",
                clients: [{ clientID: "" }],
            },
        },
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
        {
            config: {
                thirdPartyId: "google",
                clients: [{ clientID: "" }],
            },
        },
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
        {
            config: {
                thirdPartyId: "google",
                clients: [{ clientID: "" }],
            },
        },
    ],
    smsDelivery: {
        service: new SupertokensServiceTPP(""),
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
        service: new SMTPServiceTPP({
            smtpSettings: {
                host: "",
                authUsername: "",
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
        service: new SMTPServiceTPP({
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
        service: new SupertokensServiceTPP(""),
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
        service: new SupertokensServiceP(""),
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
        service: new SMTPServiceP({
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
        service: new SMTPServiceP({
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
        service: new SupertokensServiceP(""),
    },
    contactMethod: "PHONE",
    flowType: "MAGIC_LINK",
});

EmailPassword.init({
    emailDelivery: {
        service: new SMTPServiceEP({
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
                        if (input.type === "PASSWORD_RESET") {
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
                    if (input.type === "PASSWORD_RESET") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
    },
});

ThirdPartyEmailPassword.init({
    emailDelivery: {
        service: new SMTPServiceTPEP({
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
                        if (input.type === "PASSWORD_RESET") {
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
                    if (input.type === "PASSWORD_RESET") {
                    }
                    await oI.sendEmail(input);
                },
            };
        },
    },
});

ThirdParty.init({
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
                        mergeIntoAccessTokenPayload: session.mergeIntoAccessTokenPayload,
                        assertClaims: session.assertClaims,
                        fetchAndSetClaim: session.fetchAndSetClaim,
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
                fetchAndSetClaim: originalImpl.fetchAndSetClaim,
                setClaimValue: originalImpl.setClaimValue,
                getClaimValue: originalImpl.getClaimValue,
                removeClaim: originalImpl.removeClaim,
                validateClaims: originalImpl.validateClaims,
                validateClaimsInJWTPayload: originalImpl.validateClaimsInJWTPayload,
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
                validate: async (payload) => {
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
        overrideGlobalClaimValidators: (globalClaimValidators) => {
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
            await session.fetchAndSetClaim(boolClaim);

            await session.assertClaims([
                stringClaim.validators.startsWith("!!!!"),
                boolClaim.validators.hasValue(true),
            ]);
        }

        // nextJS types
        let session2 = await NextJS.superTokensNextWrapper(
            async (next) => {
                // Works without null checking by default
                const defaultSession = await Session.getSession(req, res);
                defaultSession.getUserId();

                // Works without null checking when sessions are explicitly required
                const requiredSession = await Session.getSession(req, res, { sessionRequired: true });
                requiredSession.getUserId();

                // REQUIRES null checking when sessions are explicitly NOT required
                const optionalSession = await Session.getSession(req, res, { sessionRequired: false });
                optionalSession?.getUserId();

                return defaultSession;
            },
            req,
            res
        );
        if (session2 !== undefined) {
            const handle = session2.getHandle();
            await Session.fetchAndSetClaim(handle, boolClaim);
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
                    input.accessTokenPayload = stringClaim.removeFromPayload(input.accessTokenPayload);
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        ...(await boolClaim.build(input.userId, input.userContext)),
                        lastTokenRefresh: Date.now(),
                    };
                    return originalImplementation.createNewSession(input);
                },
            };
        },
    },
});

Session.validateClaimsForSessionHandle("asdf");
Session.validateClaimsForSessionHandle("asdf", (globalClaimValidators) => [
    ...globalClaimValidators,
    boolClaim.validators.isTrue(),
]);
Session.validateClaimsForSessionHandle(
    "asdf",
    (globalClaimValidators, info) => [...globalClaimValidators, boolClaim.validators.isTrue(info.expiry)],
    { test: 1 }
);

Session.validateClaimsInJWTPayload("userId", {});
Session.validateClaimsInJWTPayload("userId", {}, (globalClaimValidators) => [
    ...globalClaimValidators,
    boolClaim.validators.isTrue(),
]);
Session.validateClaimsInJWTPayload(
    "userId",
    {},
    (globalClaimValidators, userId) => [...globalClaimValidators, stringClaim.validators.startsWith(userId)],
    { test: 1 }
);
EmailVerification.sendEmail({
    emailVerifyLink: "",
    type: "EMAIL_VERIFICATION",
    user: {
        email: "",
        id: "",
    },
});

ThirdPartyEmailPassword.sendEmail({
    type: "PASSWORD_RESET",
    passwordResetLink: "",
    user: {
        email: "",
        id: "",
    },
});
ThirdPartyEmailPassword.sendEmail({
    type: "PASSWORD_RESET",
    passwordResetLink: "",
    user: {
        email: "",
        id: "",
    },
    userContext: {},
});

ThirdPartyPasswordless.sendEmail({
    codeLifetime: 234,
    email: "",
    type: "PASSWORDLESS_LOGIN",
    preAuthSessionId: "",
    userInputCode: "",
    urlWithLinkCode: "",
});
ThirdPartyPasswordless.sendEmail({
    codeLifetime: 234,
    email: "",
    type: "PASSWORDLESS_LOGIN",
    preAuthSessionId: "",
    userContext: {},
});

ThirdPartyPasswordless.sendSms({
    codeLifetime: 234,
    phoneNumber: "",
    type: "PASSWORDLESS_LOGIN",
    preAuthSessionId: "",
    userInputCode: "",
    urlWithLinkCode: "",
});
ThirdPartyPasswordless.sendSms({
    codeLifetime: 234,
    phoneNumber: "",
    type: "PASSWORDLESS_LOGIN",
    preAuthSessionId: "",
    userContext: {},
});

Supertokens.init({
    appInfo: {
        apiDomain: "",
        appName: "",
        websiteDomain: "",
    },
    recipeList: [
        Dashboard.init({
            apiKey: "",
            override: {
                functions: () => {
                    return {
                        getDashboardBundleLocation: async () => {
                            return "";
                        },
                        shouldAllowAccess: async () => {
                            return false;
                        },
                    };
                },
                apis: () => {
                    return {
                        dashboardGET: async () => {
                            return "";
                        },
                    };
                },
            },
        }),
    ],
});

Dashboard.init({
    apiKey: "",
});

Supertokens.init({
    appInfo: {
        apiDomain: "..",
        appName: "..",
        websiteDomain: "..",
    },
    recipeList: [JWT.init()],
});

app.post("/create-anonymous-session", async (req, res) => {
    let token = await JWT.createJWT(
        {
            sub: "<Generate random ID>",
            isAnonymous: true,
            // other info...
        },
        3153600000
    ); // 100 years validity.
    if (token.status !== "OK") {
        throw new Error("Should never come here");
    }
    res.json({
        token: token.jwt,
    });
});
