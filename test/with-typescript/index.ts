import * as express from "express";
import Supertokens from "../..";
import Session, { RecipeInterface, SessionClaimValidator, VerifySessionOptions } from "../../recipe/session";
import EmailVerification from "../../recipe/emailverification";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "../../framework/express";
import NextJS from "../../nextjs";
import ThirdPartyEmailPassword from "../../recipe/thirdpartyemailpassword";
import ThirdParty from "../../recipe/thirdparty";
import Multitenancy from "../../recipe/multitenancy";
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
import { BooleanClaim, PrimitiveClaim } from "../../recipe/session/claims";
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
                        tenantId: input.tenantId,
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
                        tenantId: input.tenantId,
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
                        tenantId: input.tenantId,
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
                        tenantId: input.tenantId,
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
                clients: [{ clientId: "" }],
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
                clients: [{ clientId: "" }],
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
                clients: [{ clientId: "" }],
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

ThirdParty.init();

ThirdParty.init({});

ThirdParty.init({
    signInAndUpFeature: {},
});

ThirdParty.init({
    signInAndUpFeature: {
        providers: [],
    },
});

Multitenancy.init();

Multitenancy.init({});

Multitenancy.init({
    getAllowedDomainsForTenantId: async function (tenantId, userContext) {
        return ["example.com"];
    },
});

Multitenancy.init({
    getAllowedDomainsForTenantId: async function (tenantId, userContext) {
        return undefined;
    },
});

Multitenancy.init({
    errorHandlers: {},
});

Multitenancy.init({
    errorHandlers: {
        onRecipeDisabledForTenantError: async function (message, userContext) {},
        onTenantDoesNotExistError: async function (message, userContext) {},
    },
});

Multitenancy.init({
    override: {
        apis: (oI) => {
            return {
                ...oI,
                loginMethodsGET: async function ({ tenantId, clientType, options, userContext }) {
                    return {
                        status: "OK",
                        emailPassword: {
                            enabled: true,
                        },
                        passwordless: {
                            enabled: true,
                        },
                        thirdParty: {
                            enabled: true,
                            providers: [],
                        },
                    };
                },
            };
        },
        functions: (oI) => {
            return {
                ...oI,
                getTenantId: async function ({ tenantIdFromFrontend, userContext }) {
                    return tenantIdFromFrontend;
                },

                createOrUpdateTenant: async function ({ tenantId, config, userContext }) {
                    return await oI.createOrUpdateTenant({
                        tenantId,
                        config,
                        userContext,
                    });
                },

                deleteTenant: async function ({ tenantId, userContext }) {
                    return await oI.deleteTenant({ tenantId, userContext });
                },

                getTenant: async function ({ tenantId, userContext }) {
                    return await oI.getTenant({ tenantId, userContext });
                },

                listAllTenants: async function ({ userContext }) {
                    return await oI.listAllTenants({ userContext });
                },

                createOrUpdateThirdPartyConfig: async function ({ config, skipValidation, userContext }) {
                    return await oI.createOrUpdateThirdPartyConfig({ config, skipValidation, userContext });
                },

                deleteThirdPartyConfig: async function ({ tenantId, thirdPartyId, userContext }) {
                    return await oI.deleteThirdPartyConfig({ tenantId, thirdPartyId, userContext });
                },
            };
        },
    },
});

import { TypeInput } from "../../types";
import { TypeInput as SessionTypeInput } from "../../recipe/session/types";
import { TypeInput as EPTypeInput } from "../../recipe/emailpassword/types";
import SuperTokensError from "../../lib/build/error";

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
                        getSessionDataFromDatabase: session.getSessionDataFromDatabase,
                        getUserId: session.getUserId,
                        getTenantId: session.getTenantId,
                        revokeSession: session.revokeSession,
                        updateSessionDataInDatabase: session.updateSessionDataInDatabase,
                        mergeIntoAccessTokenPayload: session.mergeIntoAccessTokenPayload,
                        assertClaims: session.assertClaims,
                        fetchAndSetClaim: session.fetchAndSetClaim,
                        setClaimValue: session.setClaimValue,
                        getClaimValue: session.getClaimValue,
                        removeClaim: session.removeClaim,
                        getExpiry: session.getExpiry,
                        getTimeCreated: session.getTimeCreated,
                        getAllSessionTokensDangerously: session.getAllSessionTokensDangerously,
                        attachToRequestResponse: session.attachToRequestResponse,
                    };
                },
                getAllSessionHandlesForUser: originalImpl.getAllSessionHandlesForUser,
                refreshSession: originalImpl.refreshSession,
                revokeAllSessionsForUser: originalImpl.revokeAllSessionsForUser,
                revokeMultipleSessions: originalImpl.revokeMultipleSessions,
                revokeSession: originalImpl.revokeSession,
                updateSessionDataInDatabase: originalImpl.updateSessionDataInDatabase,
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
        Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "NONE", cookieDomain: "" }),
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

                            input.sessionDataInDatabase = {
                                ...input.sessionDataInDatabase,
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
                                    tenantId: input.tenantId,
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
    exposeAccessTokenToFrontendInCookieBasedAuth: true,
    useDynamicAccessTokenSigningKey: false,
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
                        tenantId: input.tenantId,
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
                        let session = await Session.createNewSession(options.req, options.res, user.id);
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

                    await session.mergeIntoAccessTokenPayload({
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
    "tenant"
);
Session.validateClaimsForSessionHandle(
    "asdf",
    (globalClaimValidators, info) => [...globalClaimValidators, boolClaim.validators.isTrue(info.expiry)],
    "tenant",
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

Dashboard.init();
Dashboard.init(undefined);
Dashboard.init({});

Session.init({
    getTokenTransferMethod: () => "cookie",
});

Session.init({
    getTokenTransferMethod: () => "header",
    override: {
        functions: (oI) => ({
            ...oI,
            getSession: async (input) => {
                const session = await oI.getSession(input);
                if (session !== undefined) {
                    const origPayload = session.getAccessTokenPayload();
                    if (origPayload.appSub === undefined) {
                        await session.mergeIntoAccessTokenPayload({ appSub: origPayload.sub, sub: null });
                    }
                }
                return session;
            },
            createNewSession: async (input) => {
                return oI.createNewSession({
                    ...input,
                    accessTokenPayload: {
                        ...input.accessTokenPayload,
                        appSub: input.userId + "!!!",
                    },
                });
            },
        }),
        openIdFeature: {
            functions: (oI) => ({
                ...oI,
                getOpenIdDiscoveryConfiguration: async (input) => ({
                    issuer: "your issuer",
                    jwks_uri: "https://your.api.domain/auth/jwt/jwks.json",
                    status: "OK",
                }),
            }),
        },
    },
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

Passwordless.init({
    contactMethod: "EMAIL",
    flowType: "MAGIC_LINK",
    override: {
        functions: (original) => {
            return {
                ...original,
                consumeCode: async function (input) {
                    let device = await Passwordless.listCodesByPreAuthSessionId({
                        preAuthSessionId: input.preAuthSessionId,
                    });
                    if (device !== undefined && input.userContext.calledManually === undefined) {
                        if (device.phoneNumber === "TEST_PHONE_NUMBER") {
                            let user = await Passwordless.signInUp({
                                phoneNumber: "TEST_PHONE_NUMBER",
                                userContext: { calledManually: true },
                            });
                            return {
                                status: "OK",
                                createdNewUser: user.createdNewUser,
                                user: user.user,
                            };
                        }
                    }
                    return original.consumeCode(input);
                },
            };
        },
    },
});

async function getSessionWithErrorHandlerMiddleware(req: express.Request, resp: express.Response) {
    const session = await Session.getSession(req, resp, {
        /* options */
    });

    // ...
}

async function getSessionWithoutErrorHandler(req: express.Request, resp: express.Response, next: express.NextFunction) {
    try {
        const session = await Session.getSession(req, resp, {
            /* options */
        });
        /* .... */
    } catch (err) {
        if (SuperTokensError.isErrorFromSuperTokens(err)) {
            if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
                resp.status(401).json({ message: "try again " });
                // This means that the session exists, but the access token
                // has expired.

                // You can handle this in a custom way by sending a 401.
                // Or you can call the errorHandler middleware as shown below
            } else if (err.type === Session.Error.UNAUTHORISED) {
                resp.status(401).json({ message: "try again " });
                // This means that the session does not exist anymore.
                // You can handle this in a custom way by sending a 401.
                // Or you can call the errorHandler middleware as shown below
            } else if (err.type === Session.Error.TOKEN_THEFT_DETECTED) {
                // Security Alert!!
                resp.status(401).json({ message: "try again " });
                // Session hijacking attempted. You should revoke the session
                // using Session.revokeSession fucntion and send a 401
            } else if (err.type === Session.Error.INVALID_CLAIMS) {
                resp.status(403).json({ status: "CLAIM_VALIDATION_ERROR", claimValidationErrors: err.payload });
                // The user is missing some required claim.
                // You can pass the missing claims to the frontend and handle it there
            }

            // OR you can use this errorHandler which will
            // handle all of the above errors in the default way
            errorHandler()(err, req, resp, (err) => {
                next(err);
            });
        } else {
            next(err);
        }
    }
}

async function getSessionWithoutRequestOrErrorHandler(req: express.Request, resp: express.Response) {
    const accessToken = req.headers.authorization?.replace(/^Bearer /, "");

    // We only need to split this declaration (and have the else statement) if the session is optional
    let session;
    if (!accessToken) {
        // This means that the user doesn't have an active session
        return resp.status(401).json({ message: "try again " }); // Or equivalent...
    } else {
        try {
            const session1 = await Session.getSessionWithoutRequestResponse(accessToken, undefined, {
                antiCsrfCheck: false,
            });
            const session2 = await Session.getSessionWithoutRequestResponse(accessToken, undefined);
            const session3 = await Session.getSessionWithoutRequestResponse(accessToken, undefined, {
                sessionRequired: false,
            });
            let x: boolean | undefined;
            const session4 = await Session.getSessionWithoutRequestResponse(accessToken, undefined, {
                sessionRequired: x,
            });
            const options: VerifySessionOptions = {};
            session = await Session.getSessionWithoutRequestResponse(accessToken, undefined, { antiCsrfCheck: false });
            session = await Session.getSessionWithoutRequestResponse(accessToken, undefined, { ...options });
        } catch (ex) {
            if (Session.Error.isErrorFromSuperTokens(ex)) {
                if (ex.type === Session.Error.INVALID_CLAIMS) {
                    return resp.status(403).json({
                        message: "invalid claim",
                        claimValidationErrors: ex.payload,
                    }); // Or equivalent...
                } else {
                    resp.status(401);
                }
            } else {
                throw ex;
            }
        }
    }
    // API code...
}

async function getSessionWithoutRequestWithErrorHandler(req: express.Request, resp: express.Response) {
    const accessToken = req.headers.authorization?.replace(/^Bearer /, "");

    // We only need to split this declaration (and have the else statement) if the session is optional
    let session;
    if (!accessToken) {
        // This means that the user doesn't have an active session
        return resp.status(401).json({ message: "try again " });
    } else {
        session = await Session.getSessionWithoutRequestResponse(accessToken, undefined, { antiCsrfCheck: false });
    }
    // API code...
    if (session) {
        const tokens = session.getAllSessionTokensDangerously();
        if (tokens.accessAndFrontTokenUpdated) {
            resp.set("st-access-token", tokens.accessToken);
            resp.set("front-token", tokens.frontToken);
        }
    }
}

async function createNewSessionWithoutRequestResponse(req: express.Request, resp: express.Response) {
    const userId = "user-id"; // This would be fetched from somewhere

    const session = await Session.createNewSessionWithoutRequestResponse(userId);

    const tokens = session.getAllSessionTokensDangerously();
    if (tokens.accessAndFrontTokenUpdated) {
        resp.set("st-access-token", tokens.accessToken);
        resp.set("front-token", tokens.frontToken);
        resp.set("st-refresh-token", tokens.refreshToken);
        if (tokens.antiCsrfToken) {
            resp.set("anti-csrf", tokens.antiCsrfToken);
        }
    }
}

async function refreshSessionWithoutRequestResponse(req: express.Request, resp: express.Response) {
    const refreshToken = req.headers.authorization?.replace(/^Bearer /, "");

    if (!refreshToken) {
        // This means that the user doesn't have an active session
        return resp.status(401);
    } else {
        let session;

        try {
            session = await Session.refreshSessionWithoutRequestResponse(refreshToken, true);
        } catch (ex) {
            if (Session.Error.isErrorFromSuperTokens(ex)) {
                return resp
                    .status(401)
                    .set("st-access-token", "")
                    .set("set-refresh-token", "")
                    .set("front-token", "remove"); // Or equivalent...
            } else {
                throw ex;
            }
        }

        const tokens = session.getAllSessionTokensDangerously();

        if (tokens.accessAndFrontTokenUpdated) {
            resp.set("st-access-token", tokens.accessToken);
            resp.set("front-token", tokens.frontToken);
            resp.set("st-refresh-token", tokens.refreshToken);
            if (tokens.antiCsrfToken) {
                resp.set("anti-csrf", tokens.antiCsrfToken);
            }
        }
    }
}
