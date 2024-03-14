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
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let { verifySession } = require("../../recipe/session/framework/express");
let { middleware, errorHandler } = require("../../framework/express");
let express = require("express");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let http = require("http");
let cors = require("cors");
let EmailVerificationRaw = require("../../lib/build/recipe/emailverification/recipe").default;
let EmailVerification = require("../../recipe/emailverification");
let UserRolesRaw = require("../../lib/build/recipe/userroles/recipe").default;
let UserRoles = require("../../recipe/userroles");
let PasswordlessRaw = require("../../lib/build/recipe/passwordless/recipe").default;
let Passwordless = require("../../recipe/passwordless");
let ThirdPartyPasswordless = require("../../recipe/thirdpartypasswordless");
let { default: SuperTokensRaw } = require("../../lib/build/supertokens");
const { default: EmailPasswordRaw } = require("../../lib/build/recipe/emailpassword/recipe");
const { default: ThirdPartyRaw } = require("../../lib/build/recipe/thirdparty/recipe");
const { default: ThirdPartyEmailPasswordRaw } = require("../../lib/build/recipe/thirdpartyemailpassword/recipe");
const { default: DashboardRaw } = require("../../lib/build/recipe/dashboard/recipe");
const { default: MultitenancyRaw } = require("../../lib/build/recipe/multitenancy/recipe");
const Multitenancy = require("../../lib/build/recipe/multitenancy");
const AccountLinking = require("../../lib/build/recipe/accountlinking");
const { default: AccountLinkingRaw } = require("../../lib/build/recipe/accountlinking/recipe");

const { default: ThirdPartyPasswordlessRaw } = require("../../lib/build/recipe/thirdpartypasswordless/recipe");
const { default: SessionRaw } = require("../../lib/build/recipe/session/recipe");

const UserMetadataRaw = require("../../lib/build/recipe/usermetadata/recipe").default;
const UserMetadata = require("../../recipe/usermetadata");

const MultiFactorAuthRaw = require("../../lib/build/recipe/multifactorauth/recipe").default;
const MultiFactorAuth = require("../../recipe/multifactorauth");

const TOTPRaw = require("../../lib/build/recipe/totp/recipe").default;
const TOTP = require("../../recipe/totp");
const OTPAuth = require("otpauth");

let {
    startST,
    killAllST,
    setupST,
    cleanST,
    setKeyValueInConfig,
    customAuth0Provider,
    stopST,
    mockThirdPartyProvider,
} = require("./utils");

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();
// const originalSend = app.response.send;
// app.response.send = function sendOverWrite(body) {
//     originalSend.call(this, body);
//     this.__custombody__ = body;
// };

// morgan.token("body", function (req, res) {
//     return JSON.stringify(req.body);
// });

// morgan.token("res-body", function (req, res) {
//     return typeof res.__custombody__ ? res.__custombody__ : JSON.stringify(res.__custombody__);
// });
app.use(urlencodedParser);
app.use(jsonParser);
app.use(cookieParser());

// app.use(morgan("[:date[iso]] :url :method :body", { immediate: true }));
// app.use(morgan("[:date[iso]] :url :method :status :response-time ms - :res[content-length] :res-body"));

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
let latestURLWithToken = "";

let deviceStore = new Map();
function saveCode({ email, phoneNumber, preAuthSessionId, urlWithLinkCode, userInputCode }) {
    console.log(arguments[0]);
    const device = deviceStore.get(preAuthSessionId) || {
        preAuthSessionId,
        codes: [],
    };
    device.codes.push({
        urlWithLinkCode,
        userInputCode,
    });
    deviceStore.set(preAuthSessionId, device);
}

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

initST();

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

app.post("/startst", async (req, res) => {
    try {
        connectionURI = await startST(req.body);
        console.log("Connection URI: " + connectionURI);

        const OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED =
            "N2yITHflaFS4BPm7n0bnfFCjP4sJoTERmP0J=kXQ5YONtALeGnfOOe2rf2QZ0mfOh0aO3pBqfF-S0jb0ABpat6pySluTpJO6jieD6tzUOR1HrGjJO=50Ob3mHi21tQHJ";

        await fetch(`${connectionURI}/ee/license`, {
            method: "PUT",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                licenseKey: OPAQUE_KEY_WITH_ALL_FEATURES_ENABLED,
            }),
        });

        initST();
        res.send(connectionURI + "");
    } catch (err) {
        console.log(err);
        res.status(500).send(err.toString());
    }
});

app.post("/beforeeach", async (req, res) => {
    deviceStore = new Map();

    mfaInfo = {};
    accountLinkingConfig = {};
    passwordlessConfig = {};
    enabledProviders = undefined;
    enabledRecipes = undefined;

    if (process.env.INSTALL_PATH !== undefined) {
        await killAllST();
        await setupST();
    }
    initST();
    res.send();
});

app.post("/after", async (req, res) => {
    if (process.env.INSTALL_PATH !== undefined) {
        await killAllST();
        await cleanST();
    }
    res.send();
});

app.post("/stopst", async (req, res) => {
    await stopST(req.body.pid);
    res.send("");
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

app.post("/setMFAInfo", async (req, res) => {
    mfaInfo = req.body;

    res.send({ status: "OK" });
});

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

app.post("/test/setFlow", (req, res) => {
    initST({
        passwordlessConfig: {
            contactMethod: req.body.contactMethod,
            flowType: req.body.flowType,

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
        },
    });
    res.sendStatus(200);
});

app.post("/setupTenant", async (req, res) => {
    const { tenantId, loginMethods, coreConfig } = req.body;
    let coreResp = await Multitenancy.createOrUpdateTenant(tenantId, {
        emailPasswordEnabled: loginMethods.emailPassword?.enabled === true,
        thirdPartyEnabled: loginMethods.thirdParty?.enabled === true,
        passwordlessEnabled: loginMethods.passwordless?.enabled === true,
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

app.post("/test/setFlow", (req, res) => {
    passwordlessConfig = {
        contactMethod: req.body.contactMethod,
        flowType: req.body.flowType,

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
    initST();
    res.sendStatus(200);
});

app.post("/test/setAccountLinkingConfig", (req, res) => {
    accountLinkingConfig = {
        ...req.body,
    };
    initST();
    res.sendStatus(200);
});

app.post("/test/setEnabledRecipes", (req, res) => {
    enabledRecipes = req.body.enabledRecipes;
    enabledProviders = req.body.enabledProviders;
    initST();
    res.sendStatus(200);
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
    available.push("thirdpartypasswordless");
    available.push("generalerror");
    available.push("userroles");
    available.push("multitenancy");
    available.push("multitenancyManagementEndpoints");
    available.push("accountlinking");
    available.push("mfa");
    available.push("recipeConfig");

    res.send({
        available,
    });
});

app.use(errorHandler());

app.use(async (err, req, res, next) => {
    try {
        console.error(err);
        res.status(500).send(err);
    } catch (ignored) {}
});

let server = http.createServer(app);
server.listen(process.env.NODE_PORT === undefined ? 8083 : process.env.NODE_PORT, "0.0.0.0");

/*
 * Setup and start the core when running the test application when running with  the following command:
 * START=true TEST_MODE=testing INSTALL_PATH=../../../supertokens-root NODE_PORT=8082 node .
 * or
 * npm run server
 */
(async function (shouldSpinUp) {
    if (shouldSpinUp) {
        console.log(`Start supertokens for test app`);
        try {
            await killAllST();
            await cleanST();
        } catch (e) {}

        await setupST();
        const pid = await startST();
        console.log(`Application started on http://localhost:${process.env.NODE_PORT | 8083}`);
        console.log(`processId: ${pid}`);
    }
})(process.env.START === "true");

function initST({ passwordlessConfig } = {}) {
    mfaInfo = {};

    UserRolesRaw.reset();
    ThirdPartyPasswordlessRaw.reset();
    PasswordlessRaw.reset();
    EmailVerificationRaw.reset();
    EmailPasswordRaw.reset();
    ThirdPartyRaw.reset();
    ThirdPartyEmailPasswordRaw.reset();
    SessionRaw.reset();
    MultitenancyRaw.reset();
    AccountLinkingRaw.reset();
    UserMetadataRaw.reset();
    MultiFactorAuthRaw.reset();
    TOTPRaw.reset();
    SuperTokensRaw.reset();

    passwordlessConfig = {
        contactMethod: "EMAIL_OR_PHONE",
        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        createAndSendCustomTextMessage: saveCode,
        createAndSendCustomEmail: saveCode,
        ...passwordlessConfig,
    };

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
            "thirdpartyemailpassword",
            ThirdPartyEmailPassword.init({
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
                providers:
                    enabledProviders !== undefined
                        ? fullProviderList.filter((config) => enabledProviders.includes(config.config))
                        : fullProviderList,
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            emailPasswordSignUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign up",
                                    };
                                }

                                return originalImplementation.emailPasswordSignUpPOST(input);
                            },
                            passwordResetPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password consume",
                                    };
                                }
                                return originalImplementation.passwordResetPOST(input);
                            },
                            generatePasswordResetTokenPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API reset password",
                                    };
                                }
                                return originalImplementation.generatePasswordResetTokenPOST(input);
                            },
                            emailPasswordEmailExistsGET: async function (input) {
                                let generalError = input.options.req.getKeyValueFromQuery("generalError");
                                if (generalError === "true") {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API email exists",
                                    };
                                }
                                return originalImplementation.emailPasswordEmailExistsGET(input);
                            },
                            emailPasswordSignInPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in",
                                    };
                                }
                                return originalImplementation.emailPasswordSignInPOST(input);
                            },
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
                            thirdPartySignInUpPOST: async function (input) {
                                let body = await input.options.req.getJSONBody();
                                if (body.generalError === true) {
                                    return {
                                        status: "GENERAL_ERROR",
                                        message: "general error from API sign in up",
                                    };
                                }

                                return originalImplementation.thirdPartySignInUpPOST(input);
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

    passwordlessConfig = {
        contactMethod: "EMAIL_OR_PHONE",
        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
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
        ...passwordlessConfig,
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
                            return originalImplementation.consumeCodePOST(input);
                        },
                    };
                },
            },
        }),
    ]);

    recipeList.push([
        "thirdpartypasswordless",
        ThirdPartyPasswordless.init({
            ...passwordlessConfig,
            providers:
                enabledProviders !== undefined
                    ? fullProviderList.filter((config) => enabledProviders.includes(config.config))
                    : fullProviderList,
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
                        thirdPartySignInUpPOST: async function (input) {
                            let body = await input.options.req.getJSONBody();
                            if (body.generalError === true) {
                                return {
                                    status: "GENERAL_ERROR",
                                    message: "general error from API sign in up",
                                };
                            }

                            return originalImplementation.thirdPartySignInUpPOST(input);
                        },
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
                            return originalImplementation.consumeCodePOST(input);
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
            ...accountLinkingConfig?.shouldAutoLink,
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
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
            apiDomain: "localhost:" + (process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT),
            websiteDomain,
        },
        supertokens: {
            connectionURI,
        },
        recipeList:
            enabledRecipes !== undefined
                ? recipeList.filter(([key]) => enabledRecipes.includes(key)).map(([_key, recipeFunc]) => recipeFunc)
                : recipeList.map(([_key, recipeFunc]) => recipeFunc),
    });
}
