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

const { default: ThirdPartyPasswordlessRaw } = require("../../lib/build/recipe/thirdpartypasswordless/recipe");
const { default: SessionRaw } = require("../../lib/build/recipe/session/recipe");
let { startST, killAllST, setupST, cleanST, customAuth0Provider } = require("./utils");

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();
app.use(urlencodedParser);
app.use(jsonParser);
app.use(cookieParser());

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
let latestURLWithToken = "";

let deviceStore = new Map();
function saveCode({ email, phoneNumber, preAuthSessionId, urlWithLinkCode, userInputCode }) {
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

app.post("/beforeeach", async (req, res) => {
    deviceStore = new Map();
    res.send();
});

app.post("/test/setFlow", (req, res) => {
    initST({
        passwordlessConfig: {
            contactMethod: req.body.contactMethod,
            flowType: req.body.flowType,
            createAndSendCustomTextMessage: saveCode,
            createAndSendCustomEmail: saveCode,
        },
    });
    res.sendStatus(200);
});

app.get("/test/getDevice", (req, res) => {
    res.send(deviceStore.get(req.query.preAuthSessionId));
});

app.get("/test/featureFlags", (req, res) => {
    const available = ["passwordless", "thirdpartypasswordless", "generalerror", "userroles"];

    res.send({
        available,
    });
});

app.get("/ping", async (req, res) => {
    res.send("success");
});

app.post("/startst", async (req, res) => {
    if (req.body && req.body.configUpdates) {
        for (const update of req.body.configUpdates) {
            await setKeyValueInConfig(update.key, update.value);
        }
    }
    let pid = await startST();
    res.send(pid + "");
});

app.post("/beforeeach", async (req, res) => {
    deviceStore = new Map();

    await killAllST();
    await setupST();
    res.send();
});

app.post("/after", async (req, res) => {
    await killAllST();
    await cleanST();
    res.send();
});

app.post("/stopst", async (req, res) => {
    await stopST(req.body.pid);
    res.send("");
});

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res) => {
    let session = req.session;
    if (session.getJWTPayload !== undefined) {
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            accessTokenPayload: session.getJWTPayload(),
            sessionData: await session.getSessionData(),
        });
    } else {
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            accessTokenPayload: session.getAccessTokenPayload(),
            sessionData: await session.getSessionData(),
        });
    }
});

app.get("/unverifyEmail", verifySession(), async (req, res) => {
    let session = req.session;
    await EmailVerification.unverifyEmail(session.getUserId());
    await session.fetchAndSetClaim(EmailVerification.EmailVerificationClaim);
    res.send({ status: "OK" });
});

app.post("/setRole", verifySession(), async (req, res) => {
    let session = req.session;
    await UserRoles.createNewRoleOrAddPermissions(req.body.role, req.body.permissions);
    await UserRoles.addRoleToUser(session.getUserId(), req.body.role);
    await session.fetchAndSetClaim(UserRoles.UserRoleClaim);
    await session.fetchAndSetClaim(UserRoles.PermissionClaim);
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
            createAndSendCustomTextMessage: saveCode,
            createAndSendCustomEmail: saveCode,
        },
    });
    res.sendStatus(200);
});

app.get("/test/getDevice", (req, res) => {
    res.send(deviceStore.get(req.query.preAuthSessionId));
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
    UserRolesRaw.reset();
    ThirdPartyPasswordlessRaw.reset();
    PasswordlessRaw.reset();
    EmailVerificationRaw.reset();
    EmailPasswordRaw.reset();
    ThirdPartyRaw.reset();
    ThirdPartyEmailPasswordRaw.reset();
    SessionRaw.reset();
    DashboardRaw.reset();

    SuperTokensRaw.reset();

    passwordlessConfig = {
        contactMethod: "EMAIL_OR_PHONE",
        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        createAndSendCustomTextMessage: saveCode,
        createAndSendCustomEmail: saveCode,
        ...passwordlessConfig,
    };

    const recipeList = [
        EmailVerification.init({
            mode: "OPTIONAL",
            createAndSendCustomEmail: (_, emailVerificationURLWithToken) => {
                console.log(emailVerificationURLWithToken);
                latestURLWithToken = emailVerificationURLWithToken;
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
            resetPasswordUsingTokenFeature: {
                createAndSendCustomEmail: (_, passwordResetURLWithToken) => {
                    console.log(passwordResetURLWithToken);
                    latestURLWithToken = passwordResetURLWithToken;
                },
            },
        }),
        ThirdParty.init({
            signInAndUpFeature: {
                providers: [
                    ThirdParty.Google({
                        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                        clientId: process.env.GOOGLE_CLIENT_ID,
                    }),
                    ThirdParty.Github({
                        clientSecret: process.env.GITHUB_CLIENT_SECRET,
                        clientId: process.env.GITHUB_CLIENT_ID,
                    }),
                    ThirdParty.Facebook({
                        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                        clientId: process.env.FACEBOOK_CLIENT_ID,
                    }),
                    customAuth0Provider(),
                ],
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
        ThirdPartyEmailPassword.init({
            signUpFeature: {
                formFields,
            },
            resetPasswordUsingTokenFeature: {
                createAndSendCustomEmail: (_, passwordResetURLWithToken) => {
                    console.log(passwordResetURLWithToken);
                    latestURLWithToken = passwordResetURLWithToken;
                },
            },
            providers: [
                ThirdPartyEmailPassword.Google({
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Github({
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    clientId: process.env.GITHUB_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Facebook({
                    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                    clientId: process.env.FACEBOOK_CLIENT_ID,
                }),
                customAuth0Provider(),
            ],
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
        Session.init({
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
        ThirdPartyPasswordless.init({
            ...passwordlessConfig,
            providers: [
                ThirdPartyEmailPassword.Google({
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Github({
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    clientId: process.env.GITHUB_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Facebook({
                    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                    clientId: process.env.FACEBOOK_CLIENT_ID,
                }),
                customAuth0Provider(),
            ],
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
        UserRoles.init(),
    ];

    SuperTokens.init({
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "localhost:" + (process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT),
            websiteDomain,
        },
        supertokens: {
            connectionURI: "http://localhost:9000",
        },
        recipeList,
    });
}
