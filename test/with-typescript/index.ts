import * as express from "express";
import { NextApiRequest, NextApiResponse } from "next";
import Supertokens, { RecipeUserId, User, getUser } from "../..";
import Session, { RecipeInterface, SessionClaimValidator, VerifySessionOptions } from "../../recipe/session";
import EmailVerification from "../../recipe/emailverification";
import EmailPassword from "../../recipe/emailpassword";
import { verifySession } from "../../recipe/session/framework/express";
import { middleware, errorHandler, SessionRequest } from "../../framework/express";
import customFramework, { CollectingResponse, PreParsedRequest } from "../../framework/custom";
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
import AccountLinking from "../../recipe/accountlinking";
import MultiFactorAuth from "../../recipe/multifactorauth";
import { verifySession as customVerifySession } from "../../recipe/session/framework/custom";
import { NextRequest, NextResponse } from "next/server";

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
    contactMethod: "EMAIL_OR_PHONE",
    flowType: "USER_INPUT_CODE",
    async validateEmailAddress(email, tenantId) {
        return undefined;
    },
    async validatePhoneNumber(phoneNumber, tenantId) {
        return undefined;
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
                            if (input.isFirstFactor) {
                                //
                            } else {
                                //
                            }
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                            if (input.isFirstFactor) {
                                //
                            } else {
                                //
                            }
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                            if (input.isFirstFactor) {
                                //
                            } else {
                                //
                            }
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                            if (input.isFirstFactor) {
                                //
                            } else {
                                //
                            }
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
                    } else if (input.type === "FOR_SECONDARY_FACTOR") {
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
                    EmailPassword.signUp("public", "test@example.com", "password123", undefined, input.userContext);
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
                        firstFactors: [],
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

                createOrUpdateThirdPartyConfig: async function ({ tenantId, config, skipValidation, userContext }) {
                    return await oI.createOrUpdateThirdPartyConfig({ tenantId, config, skipValidation, userContext });
                },

                deleteThirdPartyConfig: async function ({ tenantId, thirdPartyId, userContext }) {
                    return await oI.deleteThirdPartyConfig({ tenantId, thirdPartyId, userContext });
                },
            };
        },
    },
});

import { HTTPMethod, TypeInput, UserContext } from "../../types";
import { TypeInput as SessionTypeInput } from "../../recipe/session/types";
import { TypeInput as EPTypeInput } from "../../recipe/emailpassword/types";
import SuperTokensError from "../../lib/build/error";
import { serialize } from "cookie";
import { Response } from "express";

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
                        getRecipeUserId: session.getRecipeUserId,
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
            };
        },
    },
};

let epConfig: EPTypeInput = {
    override: {},
};

const appInfo = {
    apiDomain: "",
    appName: "",
    websiteDomain: "",
};
let config: TypeInput = {
    appInfo,
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
                validate: async (payload, userContext) => {
                    const value = this.getValueFromPayload(payload, userContext);
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
const boolClaim = new BooleanClaim({
    key: "asdf",
    fetchValue: (userId, recipeUserId, tenantId, currentPayload, userContext) => {
        return userContext.claimValue;
    },
});

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
                                (
                                    await Supertokens.listUsersByAccountInfo(
                                        "public",
                                        {
                                            email: input.email,
                                        },
                                        undefined,
                                        input.userContext
                                    )
                                ).length === 0
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
                    let body: any = await input.options.req.getJSONBody();
                    let cookie: string | undefined = input.options.req.getCookieValue("");
                    let formData: any = input.options.req.getFormData();
                    let header: string | undefined = input.options.req.getHeaderValue("");
                    let queryParam: string | undefined = input.options.req.getKeyValueFromQuery("");
                    let o = input.options.req.original;
                    let w: boolean = input.options.req.wrapperUsed;
                    let url: string = input.options.req.getOriginalURL();
                    let method: HTTPMethod = input.options.req.getMethod();
                    let res = input.options.res.original;
                    input.options.res.removeHeader("");
                    input.options.res.sendHTMLResponse("");
                    input.options.res.sendJSONResponse({});
                    input.options.res.setCookie("key", "value", "domain", true, true, 1, "path", "lax");
                    input.options.res.setHeader("key", "value", false);
                    input.options.res.setStatusCode(200);
                    let wr: boolean = input.options.res.wrapperUsed;
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
        tenantId: "public",
        includeRecipeIds: [""],
        limit: 1,
        paginationToken: "",
    });

    await Supertokens.getUsersNewestFirst({
        tenantId: "public",
        includeRecipeIds: [""],
        limit: 1,
        paginationToken: "",
    });
}

EmailPassword.init({
    signUpFeature: {
        formFields: [
            {
                id: "abc",
                validate: async (value, tenantId) => {
                    return "";
                },
            },
            {
                id: "abc",
                validate: async (value, tenantId, userContext) => {
                    return undefined;
                },
            },
        ],
    },
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
                        session: input.session,
                        userContext: input.userContext,
                    });
                    if (response.status === "WRONG_CREDENTIALS_ERROR") {
                        return response;
                    }
                    if (response.status === "LINKING_TO_SESSION_USER_FAILED") {
                        return {
                            status: "SIGN_IN_NOT_ALLOWED",
                            reason: response.status,
                        };
                    }
                    let user = response.user;

                    let origin = options.req["origin"];

                    let isAllowed = false; // TODO: check if this user is allowed to sign in via their origin..

                    if (isAllowed) {
                        // import Session from "supertokens-node/recipe/session"
                        let session = await Session.createNewSession(
                            options.req,
                            options.res,
                            "public",
                            Supertokens.convertToRecipeUserId(user.id)
                        );
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
                    input.accessTokenPayload = stringClaim.removeFromPayload(
                        input.accessTokenPayload,
                        input.userContext
                    );
                    input.accessTokenPayload = {
                        ...input.accessTokenPayload,
                        ...(await boolClaim.build(
                            input.userId,
                            input.recipeUserId,
                            input.tenantId,
                            input.accessTokenPayload,
                            input.userContext
                        )),
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
    { test: 1, ...({} as UserContext) }
);

EmailVerification.sendEmail({
    tenantId: "public",
    emailVerifyLink: "",
    type: "EMAIL_VERIFICATION",
    user: {
        id: "",
        email: "",
        recipeUserId: Supertokens.convertToRecipeUserId(""),
    },
});

ThirdPartyEmailPassword.sendEmail({
    tenantId: "public",
    type: "PASSWORD_RESET",
    passwordResetLink: "",
    user: {
        email: "",
        id: "",
        recipeUserId: Supertokens.convertToRecipeUserId(""),
    },
});
ThirdPartyEmailPassword.sendEmail({
    tenantId: "public",
    type: "PASSWORD_RESET",
    passwordResetLink: "",
    user: {
        email: "",
        id: "",
        recipeUserId: Supertokens.convertToRecipeUserId(""),
    },
    userContext: {} as UserContext,
});

ThirdPartyPasswordless.sendEmail({
    tenantId: "public",
    codeLifetime: 234,
    email: "",
    type: "PASSWORDLESS_LOGIN",
    isFirstFactor: true,
    preAuthSessionId: "",
    userInputCode: "",
    urlWithLinkCode: "",
});
ThirdPartyPasswordless.sendEmail({
    tenantId: "public",
    codeLifetime: 234,
    email: "",
    type: "PASSWORDLESS_LOGIN",
    isFirstFactor: true,
    preAuthSessionId: "",
    userContext: {} as UserContext,
});

ThirdPartyPasswordless.sendSms({
    tenantId: "public",
    codeLifetime: 234,
    phoneNumber: "",
    type: "PASSWORDLESS_LOGIN",
    isFirstFactor: true,
    preAuthSessionId: "",
    userInputCode: "",
    urlWithLinkCode: "",
});
ThirdPartyPasswordless.sendSms({
    tenantId: "public",
    codeLifetime: 234,
    phoneNumber: "",
    type: "PASSWORDLESS_LOGIN",
    isFirstFactor: true,
    preAuthSessionId: "",
    userContext: {} as UserContext,
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
                        tenantId: input.tenantId,
                        preAuthSessionId: input.preAuthSessionId,
                    });
                    if (device !== undefined && input.userContext.calledManually === undefined) {
                        if (device.phoneNumber === "TEST_PHONE_NUMBER") {
                            let user = await Passwordless.signInUp({
                                tenantId: "test",
                                phoneNumber: "TEST_PHONE_NUMBER",
                                userContext: { calledManually: true, ...({} as UserContext) },
                            });
                            return {
                                status: "OK",
                                consumedDevice: {
                                    failedCodeInputAttemptCount: 0,
                                    preAuthSessionId: input.preAuthSessionId,
                                },
                                createdNewRecipeUser: user.createdNewRecipeUser,
                                recipeUserId: user.recipeUserId,
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

    const session = await Session.createNewSessionWithoutRequestResponse(
        "public",
        Supertokens.convertToRecipeUserId(userId)
    );

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

ThirdParty.init();
ThirdPartyEmailPassword.init({
    signUpFeature: {
        formFields: [
            {
                id: "abc",
                validate: async (value, tenantId) => {
                    return "";
                },
            },
            {
                id: "abc",
                validate: async (value, tenantId, userContext) => {
                    return undefined;
                },
            },
        ],
    },
});
ThirdPartyPasswordless.init({
    contactMethod: "EMAIL",
    flowType: "MAGIC_LINK",
});

const recipeUserId = new Supertokens.RecipeUserId("asdf");

Session.init({
    override: {
        openIdFeature: {
            jwtFeature: {
                apis: (oI) => {
                    return {
                        ...oI,
                        getJWKSGET: async function (input) {
                            let result = await oI.getJWKSGET!(input);
                            input.options.res.setHeader("custom-header", "custom-value", false);
                            return result;
                        },
                    };
                },
            },
        },
    },
});

async function accountLinkingFuncsTest() {
    const session = await Session.createNewSessionWithoutRequestResponse(
        "public",
        Supertokens.convertToRecipeUserId("asdf")
    );

    const signUpResp = await EmailPassword.signUp("public", "asdf@asdf.asfd", "testpw");
    // @ts-expect-error
    if (signUpResp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpepSignUpResp = await ThirdPartyEmailPassword.emailPasswordSignUp("public", "asdf@asdf.asfd", "testpw");
    // @ts-expect-error
    if (tpepSignUpResp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const signUpRespWithSession = await EmailPassword.signUp("public", "asdf@asdf.asfd", "testpw", session);
    if (signUpRespWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpepSignUpRespWithSession = await ThirdPartyEmailPassword.emailPasswordSignUp(
        "public",
        "asdf@asdf.asfd",
        "testpw",
        session
    );
    if (tpepSignUpRespWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    if (signUpResp.status !== "OK") {
        return signUpResp;
    }

    const signInResp = await EmailPassword.signIn("public", "asdf@asdf.asfd", "testpw");
    // @ts-expect-error
    if (signInResp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpepSignInResp = await ThirdPartyEmailPassword.emailPasswordSignIn("public", "asdf@asdf.asfd", "testpw");
    // @ts-expect-error
    if (tpepSignInResp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const signInRespWithSession = await EmailPassword.signIn("public", "asdf@asdf.asfd", "testpw", session);
    if (signInRespWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpepSignInRespWithSession = await ThirdPartyEmailPassword.emailPasswordSignIn(
        "public",
        "asdf@asdf.asfd",
        "testpw",
        session
    );
    if (tpepSignInRespWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }

    let user: User;
    if (
        !signUpResp.user.isPrimaryUser &&
        (await AccountLinking.canCreatePrimaryUser(signUpResp.user.loginMethods[0].recipeUserId))
    ) {
        const createResp = await AccountLinking.createPrimaryUser(Supertokens.convertToRecipeUserId("asdf"));
        if (createResp.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new Error(createResp.status);
        }
        if (createResp.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            user = (await getUser(createResp.primaryUserId))!;
        } else {
            user = createResp.user;
        }
    } else {
        user = signUpResp.user;
    }

    const signUpResp2 = await EmailPassword.signUp("public", "asdf2@asdf.asfd", "testpw");
    if (signUpResp2.status !== "OK") {
        return signUpResp2;
    }
    const linkResp = await AccountLinking.linkAccounts(signUpResp2.recipeUserId, user.id);

    if (linkResp.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
        throw new Error("Should never happen");
    }
    if (
        linkResp.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
        linkResp.status === "OK"
    ) {
        user = linkResp.user;
    } else {
        throw new Error(linkResp.status);
    }

    const unlinkResp = await AccountLinking.unlinkAccount(signUpResp2.recipeUserId);

    if (unlinkResp.wasRecipeUserDeleted) {
        console.log("User deleted: " + signUpResp2.recipeUserId.getAsString());
    }

    const tpSignUp = await ThirdParty.manuallyCreateOrUpdateUser("public", "mytp", "tpuser", "asfd@asfd.asdf", false);
    // @ts-expect-error
    if (tpSignUp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpSignUpWithSession = await ThirdParty.manuallyCreateOrUpdateUser(
        "public",
        "mytp",
        "tpuser",
        "asfd@asfd.asdf",
        false,
        session
    );
    if (tpSignUpWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    if (tpSignUp.status !== "OK") {
        return tpSignUp;
    }

    const tpEpSignInUp = await ThirdPartyEmailPassword.thirdPartyManuallyCreateOrUpdateUser(
        "public",
        "mytp",
        "tpuser",
        "asfd@asfd.asdf",
        false
    );
    // @ts-expect-error
    if (tpEpSignInUp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpEpSignInUpWithSession = await ThirdPartyEmailPassword.thirdPartyManuallyCreateOrUpdateUser(
        "public",
        "mytp",
        "tpuser",
        "asfd@asfd.asdf",
        false,
        session
    );
    if (tpEpSignInUpWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpPwlessSignInUp = await ThirdPartyPasswordless.thirdPartyManuallyCreateOrUpdateUser(
        "public",
        "mytp",
        "tpuser",
        "asfd@asfd.asdf",
        false
    );
    // @ts-expect-error
    if (tpPwlessSignInUp.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpPwlessSignInUpWithSession = await ThirdPartyPasswordless.thirdPartyManuallyCreateOrUpdateUser(
        "public",
        "mytp",
        "tpuser",
        "asfd@asfd.asdf",
        false,
        session
    );
    if (tpPwlessSignInUpWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const consumeCode = await ThirdPartyPasswordless.consumeCode({
        linkCode: "asdf",
        preAuthSessionId: "asdf",
        tenantId: "public",
    });
    // @ts-expect-error
    if (consumeCode.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const consumeCodeWithSession = await ThirdPartyPasswordless.consumeCode({
        linkCode: "asdf",
        preAuthSessionId: "asdf",
        tenantId: "public",
        session,
    });
    if (consumeCodeWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpPwlessConsumeCode = await ThirdPartyPasswordless.consumeCode({
        linkCode: "asdf",
        preAuthSessionId: "asdf",
        tenantId: "public",
    });
    // @ts-expect-error
    if (tpPwlessConsumeCode.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    const tpPwlessConsumeCodeWithSession = await ThirdPartyPasswordless.consumeCode({
        linkCode: "asdf",
        preAuthSessionId: "asdf",
        tenantId: "public",
        session,
    });
    if (tpPwlessConsumeCodeWithSession.status === "LINKING_TO_SESSION_USER_FAILED") {
    }
    // This should be true
    const canLink = await AccountLinking.canLinkAccounts(tpSignUp.recipeUserId, user.id);

    // This should be the same as the primary user above
    const toLink = await AccountLinking.getPrimaryUserThatCanBeLinkedToRecipeUserId("public", tpSignUp.recipeUserId);

    // This should be the same primary user as toLink updated with the new link
    const linkResult = await AccountLinking.createPrimaryUserIdOrLinkAccounts("public", tpSignUp.recipeUserId);

    return {
        canChangeEmail: await AccountLinking.isEmailChangeAllowed(
            tpSignUp.recipeUserId,
            "asfd@asfd.asfd",
            true,
            session
        ),
        canSignIn: await AccountLinking.isSignInAllowed("public", tpSignUp.recipeUserId, session),
        canSignUp: await AccountLinking.isSignUpAllowed(
            "public",
            {
                recipeId: "passwordless",
                email: "asdf@asdf.asdf",
            },
            true,
            session
        ),
    };
}

Supertokens.init({
    appInfo,
    recipeList: [EmailPassword.init(), MultiFactorAuth.init(), Session.init()],
});

Supertokens.init({
    appInfo,
    recipeList: [
        EmailPassword.init(),
        MultiFactorAuth.init({
            // firstFactor defaults to all factors added by auth recipes
            // emailpassword -> [emailpassword], passwordless -> [otp-phone, otp-email, link-phone, link-email], thirdparty -> [thirdparty], etc
            firstFactors: ["emailpassword"],
        }),
        Session.init(),
    ],
});

// const noMFARequired
MultiFactorAuth.MultiFactorAuthClaim.validators.hasCompletedMFARequirementsForAuth();
MultiFactorAuth.MultiFactorAuthClaim.validators.hasCompletedRequirementList([]);
MultiFactorAuth.MultiFactorAuthClaim.validators.hasCompletedRequirementList([
    { oneOf: ["emailpassword", "thirdparty"] }, // We can include the first factors here... that feels a bit weird but it works.
    { oneOf: ["totp", "otp-phone"] }, // We require either totp or otp-phone
]);

// Any X of List is a bit weird to implement, but also a fairly niche thing I think.
Supertokens.init({
    appInfo,
    recipeList: [
        EmailPassword.init(),
        Passwordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        }),
        MultiFactorAuth.init({
            firstFactors: ["emailpassword", "otp-phone", "link-phone"],
            override: {
                functions: (oI) => ({
                    ...oI,

                    getMFARequirementsForAuth: ({ completedFactors }) => {
                        const factors = ["otp-email", "totp", "biometric"] as const;
                        const completedFromList = factors.filter((fact) => completedFactors[fact] !== undefined);
                        if (completedFromList.length >= 2) {
                            // We have completed two factors
                            return [];
                        }
                        // Otherwise the next step is completing something from the rest of the list
                        return [
                            {
                                oneOf: factors.filter((fact) => completedFactors[fact] === undefined),
                            },
                        ];
                    },
                }),
            },
        }),
        Session.init(),
    ],
});

Supertokens.init({
    appInfo,
    recipeList: [
        EmailPassword.init(),
        Passwordless.init({
            contactMethod: "EMAIL_OR_PHONE",
            flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        }),
        MultiFactorAuth.init({
            firstFactors: ["emailpassword", "otp-email", "link-email"],
            override: {
                functions: (oI) => ({
                    ...oI,
                    getMFARequirementsForAuth: () => ["otp-phone"],
                    assertAllowedToSetupFactorElseThrowInvalidClaimError: (input) => {
                        return oI.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                            ...input,
                            mfaRequirementsForAuth: Promise.resolve(["otp-phone"]),
                        });
                    },
                }),
            },
        }),
        Session.init({
            override: {
                functions: (oI) => ({
                    ...oI,
                    createNewSession: async (input) => {
                        const resp = await oI.createNewSession(input);
                        if (input.userContext.shouldCompleteTOTP) {
                            // this is a stand-in for the "remember me" check
                            await MultiFactorAuth.markFactorAsCompleteInSession(resp, "totp", input.userContext);
                        }
                        return resp;
                    },
                }),
            },
        }),
    ],
});

const nextAppDirMiddleware = customFramework.middleware<NextRequest>((req) => {
    const query = Object.fromEntries(new URL(req.url!).searchParams.entries());

    const cookies: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.cookies)) {
        if (value !== undefined) {
            cookies[key] = value;
        }
    }

    return new customFramework.PreParsedRequest({
        method: req.method as HTTPMethod,
        url: req.url!,
        query: query,
        headers: req.headers,
        cookies: cookies,
        getFormBody: async () => req.body,
        getJSONBody: async () => req.body,
    });
});

async function handleCall(req: NextRequest): Promise<NextResponse> {
    const baseResponse = new customFramework.CollectingResponse();

    const { handled, error } = await nextAppDirMiddleware(req, baseResponse);

    if (error) {
        throw error;
    }
    if (!handled) {
        return new NextResponse("Not found", { status: 404 });
    }

    for (const respCookie of baseResponse.cookies) {
        baseResponse.headers.append(
            "Set-Cookie",
            serialize(respCookie.key, respCookie.value, {
                domain: respCookie.domain,
                expires: new Date(respCookie.expires),
                httpOnly: respCookie.httpOnly,
                path: respCookie.path,
                sameSite: respCookie.sameSite,
                secure: respCookie.secure,
            })
        );
    }

    return new NextResponse(baseResponse.body, {
        headers: baseResponse.headers,
        status: baseResponse.statusCode,
    });
}

NextJS.getAppDirRequestHandler(NextResponse);

customVerifySession({ checkDatabase: true })(new PreParsedRequest({} as any), new CollectingResponse());

const nextRequest = new NextRequest("http://localhost:3000/api/user");

NextJS.getSSRSession(nextRequest.cookies.getAll(), nextRequest.headers);
NextJS.withSession(nextRequest, async function test(session): Promise<NextResponse> {
    return NextResponse.json({});
});

EmailPassword.resetPasswordUsingToken("", "", "").then((resp) => {
    // @ts-expect-error
    if (resp.status === "EMAIL_ALREADY_EXISTS_ERROR") {
    }
    // @ts-expect-error
    if (resp.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
    }

    if (
        resp.status === "OK" ||
        resp.status === "PASSWORD_POLICY_VIOLATED_ERROR" ||
        resp.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR" ||
        resp.status === "UNKNOWN_USER_ID_ERROR"
    ) {
        return;
    }
});

ThirdPartyEmailPassword.resetPasswordUsingToken("", "", "").then((resp) => {
    // @ts-expect-error
    if (resp.status === "EMAIL_ALREADY_EXISTS_ERROR") {
    }
    // @ts-expect-error
    if (resp.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
    }

    if (
        resp.status === "OK" ||
        resp.status === "PASSWORD_POLICY_VIOLATED_ERROR" ||
        resp.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR" ||
        resp.status === "UNKNOWN_USER_ID_ERROR"
    ) {
        return;
    }
});
