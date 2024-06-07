import express from "express";
import nock from "nock";
import { errorHandler, middleware } from "../../../framework/express";
import * as supertokens from "../../../lib/build";
import { User } from "../../../lib/build";
import { ProcessState } from "../../../lib/build/processState";
import AccountLinkingRecipe from "../../../lib/build/recipe/accountlinking/recipe";
import { TypeInput as AccountLinkingTypeInput, RecipeLevelUser } from "../../../lib/build/recipe/accountlinking/types";
import EmailPasswordRecipe from "../../../lib/build/recipe/emailpassword/recipe";
import { TypeInput as EmailPasswordTypeInput } from "../../../lib/build/recipe/emailpassword/types";
import EmailVerificationRecipe from "../../../lib/build/recipe/emailverification/recipe";
import { TypeInput as EmailVerificationTypeInput } from "../../../lib/build/recipe/emailverification/types";
import MultiFactorAuthRecipe from "../../../lib/build/recipe/multifactorauth/recipe";
import MultitenancyRecipe from "../../../lib/build/recipe/multitenancy/recipe";
import PasswordlessRecipe from "../../../lib/build/recipe/passwordless/recipe";
import { TypeInput as PasswordlessTypeInput } from "../../../lib/build/recipe/passwordless/types";
import SessionRecipe from "../../../lib/build/recipe/session/recipe";
import { TypeInput as SessionTypeInput } from "../../../lib/build/recipe/session/types";
import ThirdPartyRecipe from "../../../lib/build/recipe/thirdparty/recipe";
import { TypeInput as ThirdPartyTypeInput } from "../../../lib/build/recipe/thirdparty/types";
import TOTPRecipe from "../../../lib/build/recipe/totp/recipe";
import UserMetadataRecipe from "../../../lib/build/recipe/usermetadata/recipe";
import SuperTokensRecipe from "../../../lib/build/supertokens";
import { RecipeListFunction } from "../../../lib/build/types";
import AccountLinking from "../../../recipe/accountlinking";
import EmailPassword from "../../../recipe/emailpassword";
import EmailVerification from "../../../recipe/emailverification";
import MultiFactorAuth from "../../../recipe/multifactorauth";
import Multitenancy from "../../../recipe/multitenancy";
import Passwordless from "../../../recipe/passwordless";
import Session from "../../../recipe/session";
import { verifySession } from "../../../recipe/session/framework/express";
import ThirdParty from "../../../recipe/thirdparty";
import TOTP from "../../../recipe/totp";
import accountlinkingRoutes from "./accountlinking";
import emailpasswordRoutes from "./emailpassword";
import emailverificationRoutes from "./emailverification";
import { logger } from "./logger";
import multiFactorAuthRoutes from "./multifactorauth";
import multitenancyRoutes from "./multitenancy";
import passwordlessRoutes from "./passwordless";
import sessionRoutes, { getSessionVars, resetSessionVars } from "./session";
import supertokensRoutes from "./supertokens";
import thirdPartyRoutes from "./thirdparty";
import TOTPRoutes from "./totp";

const { logDebugMessage } = logger("com.supertokens:node-test-server");

const API_PORT = Number(process.env.API_PORT || 3030);

const defaultConfig = {
    appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        origin: (input) => input.request?.getHeaderValue("origin") || "localhost:3000",
    },
};

export type OverrideParamsType = {
    sendEmailToUserId: string | undefined;
    token: string | undefined;
    userPostPasswordReset: User | undefined;
    emailPostPasswordReset: string | undefined;
    sendEmailCallbackCalled: boolean | undefined;
    sendEmailToUserEmail: string | undefined;
    sendEmailToRecipeUserId: any | undefined;
    userInCallback: { id: string; email: string; recipeUserId: supertokens.RecipeUserId } | undefined;
    email: string | undefined;
    newAccountInfoInCallback: RecipeLevelUser | undefined;
    primaryUserInCallback: User | undefined;
    userIdInCallback: string | undefined;
    recipeUserIdInCallback: supertokens.RecipeUserId | string | undefined;
    info: {
        coreCallCount: number;
    };
    store: any;
};

let sendEmailToUserId = undefined;
let token = undefined;
let userPostPasswordReset = undefined;
let emailPostPasswordReset = undefined;
let sendEmailCallbackCalled = false;
let sendEmailToUserEmail = undefined;
let sendEmailToRecipeUserId = undefined;
let userInCallback = undefined;
let email = undefined;
let primaryUserInCallback;
let newAccountInfoInCallback;
let userIdInCallback;
let recipeUserIdInCallback;
const info = {
    coreCallCount: 0,
};
let store;

function resetOverrideparams() {
    sendEmailToUserId = undefined;
    token = undefined;
    userPostPasswordReset = undefined;
    emailPostPasswordReset = undefined;
    sendEmailCallbackCalled = false;
    sendEmailToUserEmail = undefined;
    sendEmailToRecipeUserId = undefined;
    userInCallback = undefined;
    email = undefined;
    newAccountInfoInCallback = undefined;
    primaryUserInCallback = undefined;
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
    info.coreCallCount = 0;
    store = undefined;
    resetSessionVars();
}

function STReset() {
    resetOverrideparams();

    EmailPasswordRecipe.reset();
    SessionRecipe.reset();
    MultitenancyRecipe.reset();
    UserMetadataRecipe.reset();
    AccountLinkingRecipe.reset();
    ThirdPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    PasswordlessRecipe.reset();
    ProcessState.getInstance().reset();
    MultiFactorAuthRecipe.reset();
    TOTPRecipe.reset();
    SuperTokensRecipe.reset();
}

function initST(config: any) {
    STReset();

    const recipeList: RecipeListFunction[] = [];

    const settings = JSON.parse(config);
    logDebugMessage("initST %j", settings);

    settings.recipeList.forEach((recipe) => {
        const config = recipe.config ? JSON.parse(recipe.config) : undefined;
        if (recipe.recipeId === "emailpassword") {
            let init: EmailPasswordTypeInput = {
                ...config,
            };

            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    apis: eval(`${config?.override.apis}`),
                };
            }

            if (config?.emailDelivery?.override) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    override: eval(`${config?.emailDelivery.override}`),
                };
            }

            recipeList.push(EmailPassword.init(init));
        }
        if (recipe.recipeId === "session") {
            let init: SessionTypeInput = {
                ...config,
            };
            if (config?.override?.functions) {
                init.override = {
                    ...init.override,
                    functions: eval(`${config?.override.functions}`),
                };
            }
            recipeList.push(Session.init(init));
        }
        if (recipe.recipeId === "accountlinking") {
            let init: AccountLinkingTypeInput = {
                ...config,
            };
            if (config?.shouldDoAutomaticAccountLinking) {
                init.shouldDoAutomaticAccountLinking = eval(`${config.shouldDoAutomaticAccountLinking}`);
            }
            if (config?.onAccountLinked) {
                init.onAccountLinked = eval(`${config.onAccountLinked}`);
            }
            recipeList.push(AccountLinking.init(init));
        }
        if (recipe.recipeId === "thirdparty") {
            let init: ThirdPartyTypeInput = {
                ...config,
            };
            if (config?.signInAndUpFeature) {
                init.signInAndUpFeature = {
                    ...config.signInAndUpFeature,
                    providers: config.signInAndUpFeature.providers.map((p) => ({
                        ...p,
                        ...(p.override ? { override: eval(`${p.override}`) } : {}),
                    })),
                };
            }
            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    ...(config?.override.apis ? { apis: eval(`${config?.override.apis}`) } : {}),
                };
            }

            recipeList.push(ThirdParty.init(init));
        }
        if (recipe.recipeId === "emailverification") {
            let init: EmailVerificationTypeInput = {
                ...config,
            };
            if (config?.emailDelivery?.override) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    override: eval(`${config?.emailDelivery.override}`),
                };
            }
            if (config?.getEmailForRecipeUserId) {
                init.getEmailForRecipeUserId = eval(`${config?.getEmailForRecipeUserId}`);
            }
            if (config?.override?.functions) {
                init.override = {
                    ...init.override,
                    functions: eval(`${config?.override.functions}`),
                };
            }
            recipeList.push(EmailVerification.init(init));
        }
        if (recipe.recipeId === "multitenancy") {
            recipeList.push(Multitenancy.init(config));
        }
        if (recipe.recipeId === "passwordless") {
            let init: PasswordlessTypeInput = {
                ...config,
            };

            if (config?.emailDelivery?.service?.sendEmail) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    service: {
                        ...config?.emailDelivery?.service,
                        sendEmail: eval(`${config?.emailDelivery?.service?.sendEmail}`),
                    },
                };
            }
            recipeList.push(Passwordless.init(init));
        }
        if (recipe.recipeId === "multifactorauth") {
            recipeList.push(MultiFactorAuth.init(config));
        }
        if (recipe.recipeId === "totp") {
            recipeList.push(TOTP.init(config));
        }
    });

    settings.recipeList = recipeList;

    if (settings.supertokens?.networkInterceptor) {
        settings.supertokens.networkInterceptor = eval(`${settings.supertokens.networkInterceptor}`);
    }

    supertokens.init(settings);
}

supertokens.init({
    ...defaultConfig,
    supertokens: {
        connectionURI: process.env.ST_CONNECTION_URI || "http://localhost:8080",
    },
    recipeList: [Session.init()],
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    logDebugMessage(req.method, req.path);
    next();
});
app.use(middleware());
app.use(errorHandler());

app.get("/test/ping", async (req, res, next) => {
    res.json({ ok: true });
});

app.post("/test/init", async (req, res, next) => {
    initST(req.body.config);
    res.json({ ok: true });
});

app.get("/test/overrideparams", async (req, res, next) => {
    let sessionVars = getSessionVars();
    const overrideparams: OverrideParamsType = {
        sendEmailToUserId,
        token,
        userPostPasswordReset,
        emailPostPasswordReset,
        sendEmailCallbackCalled,
        sendEmailToUserEmail,
        sendEmailToRecipeUserId,
        userInCallback,
        email,
        newAccountInfoInCallback,
        primaryUserInCallback: primaryUserInCallback?.toJson(),
        userIdInCallback: userIdInCallback ?? sessionVars.userIdInCallback,
        recipeUserIdInCallback:
            recipeUserIdInCallback?.getAsString() ??
            recipeUserIdInCallback ??
            sessionVars.recipeUserIdInCallback?.getAsString(),
        info,
        store,
    };
    res.json(overrideparams);
});

app.post("/test/resetoverrideparams", async (req, res, next) => {
    resetOverrideparams();
    res.json({ ok: true });
});

app.post("/test/mockexternalapi", async (req, res, next) => {
    const { url, status, body, path, method } = req.body;
    nock(url)[method](path).reply(status, body);
    res.json({ ok: true });
});

app.get("/test/waitforevent", async (req, res, next) => {
    try {
        logDebugMessage("ProcessState:waitForEvent %j", req.query);
        const instance = ProcessState.getInstance();
        const eventEnum = req.query.event ? Number(req.query.event) : null;
        const event = eventEnum ? await instance.waitForEvent(eventEnum) : undefined;
        res.json(event);
    } catch (e) {
        next(e);
    }
});

app.use("/test/supertokens", supertokensRoutes);
app.use("/test/emailpassword", emailpasswordRoutes);
app.use("/test/accountlinking", accountlinkingRoutes);
app.use("/test/session", sessionRoutes);
app.use("/test/emailverification", emailverificationRoutes);
app.use("/test/multitenancy", multitenancyRoutes);
app.use("/test/passwordless", passwordlessRoutes);
app.use("/test/multifactorauth", multiFactorAuthRoutes);
app.use("/test/thirdparty", thirdPartyRoutes);
app.use("/test/totp", TOTPRoutes);

// *** Custom routes to help with session tests ***
app.post("/create", async (req, res, next) => {
    try {
        let recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
        await Session.createNewSession(req, res, "public", recipeUserId, {}, {});
        res.status(200).send("");
    } catch (error) {
        next(error);
    }
});
app.post("/getsession", async (req, res, next) => {
    try {
        let session = await Session.getSession(req, res);
        res.status(200).json({
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId().getAsString(),
        });
    } catch (error) {
        next(error);
    }
});
app.post("/refreshsession", async (req, res, next) => {
    try {
        let session = await Session.refreshSession(req, res);
        res.status(200).json({
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId().getAsString(),
        });
    } catch (error) {
        next(error);
    }
});
app.get("/verify", verifySession(), (req, res) => res.send({ status: "OK" }));
// *** End of custom routes ***

app.use((err, req, res, next) => {
    logDebugMessage(err);
    res.status(500).json({ ...err, message: err.message });
});

app.use((req, res, next) => {
    res.status(404).send(`node-test-server: route not found ${req.method} ${req.path}`);
    if (process.env.NODE_ENV === "development") {
        throw new Error(`node-test-server: route not found ${req.method} ${req.path}`);
    }
});

app.listen(API_PORT, "localhost", () => {
    logDebugMessage(`node-test-server-server started on localhost:${API_PORT}`);
});
