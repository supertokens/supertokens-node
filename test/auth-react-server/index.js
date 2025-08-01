/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
require("dotenv").config();
let { verifySession } = require("../../recipe/session/framework/express");
let { middleware, errorHandler } = require("../../framework/express");
let { customAuth0Provider, mockThirdPartyProvider, setupCoreApplication, addLicense, getCoreUrl } = require("./utils");
let express = require("express");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let http = require("http");
let cors = require("cors");
const { readFile } = require("fs/promises");
const OTPAuth = require("otpauth");
const morgan = require("morgan");

let SuperTokens = require("../../");
let { default: SuperTokensRaw } = require("../../lib/build/supertokens");
let EmailVerification = require("../../recipe/emailverification");
let { default: EmailVerificationRaw } = require("../../lib/build/recipe/emailverification/recipe");
let EmailPassword = require("../../recipe/emailpassword");
const { default: EmailPasswordRaw } = require("../../lib/build/recipe/emailpassword/recipe");
let ThirdParty = require("../../recipe/thirdparty");
const { default: ThirdPartyRaw } = require("../../lib/build/recipe/thirdparty/recipe");
let Session = require("../../recipe/session");
const { default: SessionRaw } = require("../../lib/build/recipe/session/recipe");
let Passwordless = require("../../recipe/passwordless");
let { default: PasswordlessRaw } = require("../../lib/build/recipe/passwordless/recipe");
let UserRoles = require("../../recipe/userroles");
let { default: UserRolesRaw } = require("../../lib/build/recipe/userroles/recipe");
const Multitenancy = require("../../lib/build/recipe/multitenancy");
const { default: MultitenancyRaw } = require("../../lib/build/recipe/multitenancy/recipe");
const AccountLinking = require("../../lib/build/recipe/accountlinking");
const { default: AccountLinkingRaw } = require("../../lib/build/recipe/accountlinking/recipe");
const UserMetadata = require("../../recipe/usermetadata");
const { default: UserMetadataRaw } = require("../../lib/build/recipe/usermetadata/recipe");
const MultiFactorAuth = require("../../recipe/multifactorauth");
const { default: MultiFactorAuthRaw } = require("../../lib/build/recipe/multifactorauth/recipe");
const TOTP = require("../../recipe/totp");
const { default: TOTPRaw } = require("../../lib/build/recipe/totp/recipe");
const OAuth2Provider = require("../../recipe/oauth2provider");
const { default: OAuth2ProviderRaw } = require("../../lib/build/recipe/oauth2provider/recipe");
const Webauthn = require("../../recipe/webauthn");
const { default: WebauthnRaw } = require("../../lib/build/recipe/webauthn/recipe");

require("./webauthn/wasm_exec");

const formFields = (process.env.MIN_FIELDS && []) || [
    {
        id: "name",
    },
    {
        id: "age",
        validate: async (value) => {
            if (parseInt(value) < 18) {
                return "You must be over 18 to register";
            }

            // If no error, return undefined.
            return undefined;
        },
    },
    {
        id: "country",
        optional: true,
    },
];

const fullProviderList = [
    {
        config: {
            thirdPartyId: "google",
            clients: [
                {
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                },
            ],
        },
    },
    {
        config: {
            thirdPartyId: "github",
            clients: [
                {
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    clientId: process.env.GITHUB_CLIENT_ID,
                },
            ],
        },
    },
    {
        config: {
            thirdPartyId: "facebook",
            clients: [
                {
                    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                    clientId: process.env.FACEBOOK_CLIENT_ID,
                },
            ],
        },
    },
    customAuth0Provider(),
    mockThirdPartyProvider,
];

let connectionURI = "http://localhost:9000";
let passwordlessConfig = {};
let accountLinkingConfig = {};
let enabledProviders = undefined;
let enabledRecipes = undefined;
let mfaInfo = {};
let latestURLWithToken = "";
let deviceStore = new Map();
let webauthnStore = new Map();

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;

initST();

// Add license before the server starts
(async function () {
    await addLicense();
})();

function saveCode({ email, phoneNumber, preAuthSessionId, urlWithLinkCode, userInputCode }) {
    console.log(arguments[0]);
    const device = deviceStore.get(preAuthSessionId) || {
        preAuthSessionId,
        codes: [],
    };
    device.codes.push({
        // We add an extra item to the start of the querystring, because there was a bug in older auth-react tests
        // that only worked because we used to have an `rid` query param before the preAuthSessionId.
        // This is strictly a test fix, the extra queryparam makes no difference to the actual SDK code.
        urlWithLinkCode: urlWithLinkCode?.replace("?preAuthSessionId", "?test=fix&preAuthSessionId"),
        userInputCode,
    });
    deviceStore.set(preAuthSessionId, device);
}

const saveWebauthnToken = async ({ user, recoverAccountLink }) => {
    console.log("saveWebauthnToken: ", user, recoverAccountLink);
    const webauthn = webauthnStore.get(user.email) || {
        email: user.email,
        recoverAccountLink: "",
        token: "",
    };
    webauthn.recoverAccountLink = recoverAccountLink;

    // Parse the token from the recoverAccountLink using URL and URLSearchParams
    const url = new URL(recoverAccountLink);
    const token = url.searchParams.get("token");
    webauthn.token = token;

    webauthnStore.set(user.email, webauthn);
};

/**
 * Create a core application and initialize ST with the required config
 * @returns URL for the new core application
 */
async function setupApp({ appId, coreConfig } = {}) {
    const coreAppUrl = await setupCoreApplication({ appId, coreConfig });
    console.log("Connection URI: " + coreAppUrl);

    return coreAppUrl;
}

function initST({
    coreUrl = getCoreUrl(),
    accountLinkingConfig = {},
    enabledRecipes,
    enabledProviders,
    passwordlessFlowType,
    passwordlessContactMethod,
    mfaInfo = {},
} = {}) {
    if (process.env.TEST_MODE) {
        SuperTokensRaw.reset();
        EmailVerificationRaw.reset();
        EmailPasswordRaw.reset();
        ThirdPartyRaw.reset();
        SessionRaw.reset();
        PasswordlessRaw.reset();
        UserRolesRaw.reset();
        MultitenancyRaw.reset();
        AccountLinkingRaw.reset();
        UserMetadataRaw.reset();
        MultiFactorAuthRaw.reset();
        TOTPRaw.reset();
        OAuth2ProviderRaw.reset();
        WebauthnRaw.reset();
    }

    const recipeList = [
        [
            "emailverification",
            EmailVerification.init({
                mode: "OPTIONAL",
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                latestURLWithToken = input.emailVerifyLink;
                            },
                        };
                    },
                },
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            generateEmailVerifyTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email verification code",
                                    };
                                }
                                return oI.generateEmailVerifyTokenPOST(input);
                            },
                            verifyEmailPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email verify",
                                    };
                                }
                                return oI.verifyEmailPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
        [
            "emailpassword",
            EmailPassword.init({
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            passwordResetPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password consume",
                                    };
                                }
                                return oI.passwordResetPOST(input);
                            },
                            generatePasswordResetTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password",
                                    };
                                }
                                return oI.generatePasswordResetTokenPOST(input);
                            },
                            emailExistsGET: async function (input) {
                                let generalError = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalError === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email exists",
                                    };
                                }
                                return oI.emailExistsGET(input);
                            },
                            signUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign up",
                                    };
                                }
                                return oI.signUpPOST(input);
                            },
                            signInPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    let message = "general error from API sign in";

                                    if (body.generalErrorMessage !== undefined) {
                                        message = body.generalErrorMessage;
                                    }

                                    return {
                                        status: "GENERAL_ERROR",
                                        message,
                                    };
                                }
                                return oI.signInPOST(input);
                            },
                        };
                    },
                },
                signUpFeature: {
                    formFields,
                },
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                console.log(input.passwordResetLink);
                                latestURLWithToken = input.passwordResetLink;
                            },
                        };
                    },
                },
            }),
        ],
        [
            "thirdparty",
            ThirdParty.init({
                signInAndUpFeature: {
                    providers:
                        enabledProviders !== undefined
                            ? fullProviderList.filter(({ config }) => enabledProviders.includes(config.thirdPartyId))
                            : fullProviderList,
                },
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            authorisationUrlGET: async function (input) {
                                let generalErrorFromQuery = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalErrorFromQuery === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API authorisation url get",
                                    };
                                }

                                return originalImplementation.authorisationUrlGET(input);
                            },
                            signInUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in up",
                                    };
                                }

                                return originalImplementation.signInUpPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
        [
            "session",
            Session.init({
                overwriteSessionDuringSignIn: true,
                override: {
                    apis: function (originalImplementation) {
                        return {
                            ...originalImplementation,
                            signOutPOST: async (input) => {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from signout API",
                                    };
                                }
                                return originalImplementation.signOutPOST(input);
                            },
                        };
                    },
                },
            }),
        ],
    ];
    if (OAuth2Provider) {
        recipeList.push(["oauth2provider", OAuth2Provider.init()]);
    }
    if (Webauthn) {
        recipeList.push([
            "webauthn",
            Webauthn.init({
                emailDelivery: {
                    override: (oI) => {
                        return {
                            ...oI,
                            sendEmail: async (input) => {
                                await saveWebauthnToken(input);
                            },
                        };
                    },
                },
            }),
        ]);
    }

    const passwordlessConfig = {
        contactMethod: passwordlessContactMethod ?? "EMAIL_OR_PHONE",
        flowType: passwordlessFlowType ?? "USER_INPUT_CODE_AND_MAGIC_LINK",
        emailDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendEmail: saveCode,
                };
            },
        },
        smsDelivery: {
            override: (oI) => {
                return {
                    ...oI,
                    sendSms: saveCode,
                };
            },
        },
    };

    recipeList.push([
        "passwordless",
        Passwordless.init({
            ...passwordlessConfig,
            override: {
                apis: (originalImplementation) => {
                    return {
                        ...originalImplementation,
                        createCodePOST: async function (input) {
                            let body = await input.options.req.getJSONBody();
                            if (body.generalError === true) {
                                return {
                                    status: "GENERAL_ERROR",
                                    message: "general error from API create code",
                                };
                            }
                            return originalImplementation.createCodePOST(input);
                        },
                        resendCodePOST: async function (input) {
                            let body = await input.options.req.getJSONBody();
                            if (body.generalError === true) {
                                return {
                                    status: "GENERAL_ERROR",
                                    message: "general error from API resend code",
                                };
                            }
                            return originalImplementation.resendCodePOST(input);
                        },
                        consumeCodePOST: async function (input) {
                            let body = await input.options.req.getJSONBody();
                            if (body.generalError === true) {
                                return {
                                    status: "GENERAL_ERROR",
                                    message: "general error from API consume code",
                                };
                            }

                            const resp = await originalImplementation.consumeCodePOST(input);

                            return resp;
                        },
                    };
                },
            },
        }),
    ]);

    recipeList.push(["userroles", UserRoles.init()]);

    recipeList.push([
        "multitenancy",
        Multitenancy.init({
            getAllowedDomainsForTenantId: (tenantId) => [
                `${tenantId}.example.com`,
                websiteDomain.replace(/https?:\/\/([^:\/]*).*/, "$1"),
            ],
        }),
    ]);

    accountLinkingConfig = {
        enabled: false,
        shouldAutoLink: {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
            ...accountLinkingConfig?.shouldAutoLink,
        },
        ...accountLinkingConfig,
    };

    if (accountLinkingConfig.enabled) {
        recipeList.push([
            "accountlinking",
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: () => ({
                    ...accountLinkingConfig.shouldAutoLink,
                }),
            }),
        ]);
    }
    recipeList.push([
        "multifactorauth",
        MultiFactorAuth.init({
            firstFactors: mfaInfo.firstFactors,
            override: {
                functions: (oI) => ({
                    ...oI,
                    getFactorsSetupForUser: async (input) => {
                        const res = await oI.getFactorsSetupForUser(input);
                        if (mfaInfo?.alreadySetup) {
                            return mfaInfo.alreadySetup;
                        }
                        return res;
                    },
                    assertAllowedToSetupFactorElseThrowInvalidClaimError: async (input) => {
                        if (mfaInfo?.allowedToSetup) {
                            if (!mfaInfo.allowedToSetup.includes(input.factorId)) {
                                throw new Session.Error({
                                    type: "INVALID_CLAIMS",
                                    message: "INVALID_CLAIMS",
                                    payload: [
                                        {
                                            id: "test",
                                            reason: "test override",
                                        },
                                    ],
                                });
                            }
                        } else {
                            await oI.assertAllowedToSetupFactorElseThrowInvalidClaimError(input);
                        }
                    },
                    getMFARequirementsForAuth: async (input) => {
                        const res = await oI.getMFARequirementsForAuth(input);
                        if (mfaInfo?.requirements) {
                            return mfaInfo.requirements;
                        }
                        return res;
                    },
                }),
                apis: (oI) => ({
                    ...oI,
                    resyncSessionAndFetchMFAInfoPUT: async (input) => {
                        const res = await oI.resyncSessionAndFetchMFAInfoPUT(input);

                        if (res.status === "OK") {
                            if (mfaInfo.alreadySetup) {
                                res.factors.alreadySetup = [...mfaInfo.alreadySetup];
                            }
                        }
                        if (mfaInfo.noContacts) {
                            res.emails = {};
                            res.phoneNumbers = {};
                        }
                        return res;
                    },
                }),
            },
        }),
    ]);

    recipeList.push([
        "totp",
        TOTP.init({
            defaultPeriod: 1,
            defaultSkew: 30,
        }),
    ]);

    SuperTokens.init({
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "localhost:" + (process.env?.NODE_PORT ?? 8080),
            websiteDomain,
        },
        supertokens: {
            connectionURI: coreUrl,
        },
        debug: process.env.DEBUG === "true",
        recipeList:
            enabledRecipes !== undefined
                ? recipeList.filter(([key]) => enabledRecipes.includes(key)).map(([_key, recipeFunc]) => recipeFunc)
                : recipeList.map(([_key, recipeFunc]) => recipeFunc),
    });
}

const getWebauthnLib = async () => {
    const wasmBuffer = await readFile(__dirname + "/webauthn/webauthn.wasm");

    // Set up the WebAssembly module instance
    const go = new Go();
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    go.run(instance);

    // Export extractURL from the global object
    const createCredential = (
        registerOptions,
        { userNotPresent = true, userNotVerified = true, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const result = global.createCredential(
            registerOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create credential");
        }

        try {
            const credential = JSON.parse(result);
            return credential;
        } catch (e) {
            throw new Error("Failed to parse credential");
        }
    };

    const createAndAssertCredential = (
        registerOptions,
        signInOptions,
        { userNotPresent = false, userNotVerified = false, rpId, rpName, origin }
    ) => {
        const registerOptionsString = JSON.stringify(registerOptions);
        const signInOptionsString = JSON.stringify(signInOptions);

        const result = global.createAndAssertCredential(
            registerOptionsString,
            signInOptionsString,
            rpId,
            rpName,
            origin,
            userNotPresent,
            userNotVerified
        );

        if (!result) {
            throw new Error("Failed to create/assert credential");
        }

        try {
            const parsedResult = JSON.parse(result);
            return { attestation: parsedResult.attestation, assertion: parsedResult.assertion };
        } catch (e) {
            throw new Error("Failed to parse result");
        }
    };

    return { createCredential, createAndAssertCredential };
};

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();
// const originalSend = app.response.send;
// app.response.send = function sendOverWrite(body) {
//     originalSend.call(this, body);
//     this.__custombody__ = body;
// };

morgan.token("body", function (req, res) {
    return JSON.stringify(req.body);
});

morgan.token("res-body", function (req, res) {
    return typeof res.__custombody__ === "string" ? res.__custombody__ : JSON.stringify(res.__custombody__);
});

app.use(urlencodedParser);
app.use(jsonParser);

app.use(morgan("[:date[iso]] :url :method :body", { immediate: true }));
app.use(morgan("[:date[iso]] :url :method :status :response-time ms - :res[content-length] :res-body"));

app.use(cookieParser());

app.use(
    cors({
        origin: websiteDomain,
        allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(middleware());

app.get("/ping", async (req, res) => {
    res.send("success");
});

app.post("/test/before", (_, res) => {
    res.send();
});

app.post("/test/beforeEach", (_, res) => {
    deviceStore = new Map();
    res.send();
});

app.post("/test/afterEach", (_, res) => {
    res.send();
});

app.post("/test/after", (_, res) => {
    res.send();
});

app.post("/test/setup/app", async (req, res) => {
    try {
        res.send(await setupApp(req.body));
    } catch (err) {
        console.log(err);
        res.status(500).send(err.toString());
    }
});

app.post("/test/setup/st", async (req, res) => {
    try {
        res.send(await initST(req.body));
    } catch (err) {
        console.log(err);
        res.status(500).send(err.toString());
    }
});

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res, next) => {
    let session = req.session;
    const accessTokenPayload =
        session.getJWTPayload !== undefined ? session.getJWTPayload() : session.getAccessTokenPayload();

    try {
        const sessionData = session.getSessionData
            ? await session.getSessionData()
            : await session.getSessionDataFromDatabase();
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId().getAsString(),
            accessTokenPayload,
            sessionData,
        });
    } catch (err) {
        next(err);
    }
});

app.post("/deleteUser", async (req, res) => {
    const users = await SuperTokens.listUsersByAccountInfo("public", req.body);
    res.send(await SuperTokens.deleteUser(users[0].id));
});

app.post("/changeEmail", async (req, res) => {
    let resp;
    if (req.body.rid === "emailpassword") {
        resp = await EmailPassword.updateEmailOrPassword({
            recipeUserId: SuperTokens.convertToRecipeUserId(req.body.recipeUserId),
            email: req.body.email,
            tenantIdForPasswordPolicy: req.body.tenantId,
        });
    } else if (req.body.rid === "thirdparty") {
        const user = await SuperTokens.getUser({ userId: req.body.recipeUserId });
        const loginMethod = user.loginMethod.find((lm) => lm.recipeUserId.getAsString() === req.body.recipeUserId);
        resp = await ThirdParty.manuallyCreateOrUpdateUser(
            req.body.tenantId,
            loginMethod.thirdParty.id,
            loginMethod.thirdParty.userId,
            req.body.email,
            false
        );
    } else if (req.body.rid === "passwordless") {
        resp = await Passwordless.updateUser({
            recipeUserId: SuperTokens.convertToRecipeUserId(req.body.recipeUserId),
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
        });
    }
    res.json(resp);
});

app.get("/unverifyEmail", verifySession(), async (req, res) => {
    let session = req.session;
    await EmailVerification.unverifyEmail(session.getRecipeUserId());
    await session.fetchAndSetClaim(EmailVerification.EmailVerificationClaim, {});
    res.send({ status: "OK" });
});

app.post("/setRole", verifySession(), async (req, res) => {
    let session = req.session;
    await UserRoles.createNewRoleOrAddPermissions(req.body.role, req.body.permissions);
    await UserRoles.addRoleToUser(session.getTenantId(), session.getUserId(), req.body.role);
    await session.fetchAndSetClaim(UserRoles.UserRoleClaim, {});
    await session.fetchAndSetClaim(UserRoles.PermissionClaim, {});
    res.send({ status: "OK" });
});

app.post(
    "/checkRole",
    verifySession({
        overrideGlobalClaimValidators: async (gv, _session, userContext) => {
            const res = [...gv];
            const body = await userContext._default.request.getJSONBody();
            if (body.role !== undefined) {
                const info = body.role;
                res.push(UserRoles.UserRoleClaim.validators[info.validator](...info.args));
            }

            if (body.permission !== undefined) {
                const info = body.permission;
                res.push(UserRoles.PermissionClaim.validators[info.validator](...info.args));
            }
            return res;
        },
    }),
    async (req, res) => {
        res.send({ status: "OK" });
    }
);

app.post("/completeFactor", verifySession(), async (req, res) => {
    let session = req.session;

    await MultiFactorAuth.markFactorAsCompleteInSession(session, req.body.id);

    res.send({ status: "OK" });
});

app.post("/addRequiredFactor", verifySession(), async (req, res) => {
    let session = req.session;

    await MultiFactorAuth.addToRequiredSecondaryFactorsForUser(session.getUserId(), req.body.factorId);

    res.send({ status: "OK" });
});

app.post("/mergeIntoAccessTokenPayload", verifySession(), async (req, res) => {
    let session = req.session;

    await session.mergeIntoAccessTokenPayload(req.body);

    res.send({ status: "OK" });
});

app.get("/token", async (_, res) => {
    res.send({
        latestURLWithToken,
    });
});

app.post("/setupTenant", async (req, res) => {
    const { tenantId, loginMethods, coreConfig } = req.body;
    let coreResp = await Multitenancy.createOrUpdateTenant(tenantId, {
        firstFactors: [
            ...(loginMethods.emailPassword?.enabled === true ? ["emailpassword"] : []),
            ...(loginMethods.thirdParty?.enabled === true ? ["thirdparty"] : []),
            ...(loginMethods.passwordless?.enabled === true
                ? ["otp-phone", "otp-email", "link-phone", "link-email"]
                : []),
        ],
        coreConfig,
    });

    if (loginMethods.thirdParty.providers !== undefined) {
        for (const provider of loginMethods.thirdParty.providers) {
            await Multitenancy.createOrUpdateThirdPartyConfig(tenantId, provider);
        }
    }
    res.send(coreResp);
});

app.post("/addUserToTenant", async (req, res) => {
    const { tenantId, recipeUserId } = req.body;
    let coreResp = await Multitenancy.associateUserToTenant(tenantId, SuperTokens.convertToRecipeUserId(recipeUserId));
    res.send(coreResp);
});

app.post("/removeUserFromTenant", async (req, res) => {
    const { tenantId, recipeUserId } = req.body;
    let coreResp = await Multitenancy.disassociateUserFromTenant(
        tenantId,
        SuperTokens.convertToRecipeUserId(recipeUserId)
    );
    res.send(coreResp);
});

app.post("/removeTenant", async (req, res) => {
    const { tenantId } = req.body;
    let coreResp = await Multitenancy.deleteTenant(tenantId);
    res.send(coreResp);
});

app.get("/test/getDevice", (req, res) => {
    res.send(deviceStore.get(req.query.preAuthSessionId));
});

app.post("/test/getTOTPCode", (req, res) => {
    res.send(JSON.stringify({ totp: new OTPAuth.TOTP({ secret: req.body.secret, digits: 6, period: 1 }).generate() }));
});

app.get("/test/featureFlags", (req, res) => {
    const available = [];

    available.push("passwordless");
    available.push("generalerror");
    available.push("userroles");
    available.push("multitenancy");
    available.push("multitenancyManagementEndpoints");
    available.push("accountlinking");
    available.push("mfa");
    available.push("recipeConfig");
    available.push("accountlinking-fixes"); // this is related to 19.0 release in which we fixed a bunch of issues with account linking, including changing error codes.
    available.push("oauth2");
    available.push("webauthn");

    res.send({
        available,
    });
});

app.post("/test/create-oauth2-client", async (req, res, next) => {
    try {
        const { client } = await OAuth2Provider.createOAuth2Client(req.body);
        res.send({ client });
    } catch (e) {
        next(e);
    }
});

app.get("/test/webauthn/get-token", async (req, res) => {
    const webauthn = webauthnStore.get(req.query.email);
    if (!webauthn) {
        res.status(404).send({ error: "Webauthn not found" });
        return;
    }
    res.send({ token: webauthn.token });
});

app.post("/test/webauthn/create-and-assert-credential", async (req, res) => {
    try {
        const { registerOptionsResponse, signInOptionsResponse, rpId, rpName, origin } = req.body;

        const { createAndAssertCredential } = await getWebauthnLib();
        const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
            rpId,
            rpName,
            origin,
            userNotPresent: false,
            userNotVerified: false,
        });

        res.send({ credential });
    } catch (error) {
        console.error("Error in create-and-assert-credential:", error);
        res.status(500).send({ error: error.message });
    }
});

app.post("/test/webauthn/create-credential", async (req, res) => {
    try {
        const { registerOptionsResponse, rpId, rpName, origin } = req.body;

        const { createCredential } = await getWebauthnLib();
        const credential = createCredential(registerOptionsResponse, {
            rpId,
            rpName,
            origin,
            userNotPresent: false,
            userNotVerified: false,
        });

        res.send({ credential });
    } catch (error) {
        console.error("Error in create-credential:", error);
        res.status(500).send({ error: error.message });
    }
});

app.use(errorHandler());

app.use(async (err, req, res, next) => {
    try {
        console.error(err);
        res.status(500).send(err);
    } catch (ignored) {}
});

let server = http.createServer(app);
server.listen(process.env?.NODE_PORT ?? 8083, "0.0.0.0");
