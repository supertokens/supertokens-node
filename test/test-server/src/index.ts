import express from "express";
import nock from "nock";
import { errorHandler, middleware } from "../../../framework/express";
import * as supertokens from "../../../lib/build";
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
import { TypeInput as MFATypeInput } from "../../../lib/build/recipe/multifactorauth/types";
import TOTPRecipe from "../../../lib/build/recipe/totp/recipe";
import OAuth2Recipe from "../../../lib/build/recipe/oauth2/recipe";
import { TypeInput as OAuth2TypeInput } from "../../../lib/build/recipe/oauth2/types";
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
import OAuth2 from "../../../recipe/oauth2";
import accountlinkingRoutes from "./accountlinking";
import emailpasswordRoutes from "./emailpassword";
import emailverificationRoutes from "./emailverification";
import { logger } from "./logger";
import multiFactorAuthRoutes from "./multifactorauth";
import multitenancyRoutes from "./multitenancy";
import passwordlessRoutes from "./passwordless";
import oAuth2Routes from "./oauth2";
import sessionRoutes from "./session";
import supertokensRoutes from "./supertokens";
import thirdPartyRoutes from "./thirdparty";
import userMetadataRoutes from "./usermetadata";
import TOTPRoutes from "./totp";
import { getFunc, resetOverrideParams, getOverrideParams } from "./testFunctionMapper";

const { logDebugMessage } = logger("com.supertokens:node-test-server");

const API_PORT = Number(process.env.API_PORT || 3030);

function defaultSTInit() {
    STReset();
    supertokens.init({
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            origin: (input) => input.request?.getHeaderValue("origin") || "localhost:3000",
        },
        supertokens: {
            connectionURI: process.env.ST_CONNECTION_URI || "http://localhost:8080",
        },
        recipeList: [Session.init()],
    });
}

defaultSTInit();

function STReset() {
    resetOverrideParams();

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
    OAuth2Recipe.reset();
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
                    apis: getFunc(`${config?.override.apis}`),
                };
            }

            if (config?.emailDelivery?.override) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    override: getFunc(`${config?.emailDelivery.override}`),
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
                    functions: getFunc(`${config?.override.functions}`),
                };
            }
            recipeList.push(Session.init(init));
        }
        if (recipe.recipeId === "accountlinking") {
            let init: AccountLinkingTypeInput = {
                ...config,
            };
            if (config?.shouldDoAutomaticAccountLinking) {
                init.shouldDoAutomaticAccountLinking = getFunc(`${config.shouldDoAutomaticAccountLinking}`);
            }
            if (config?.onAccountLinked) {
                init.onAccountLinked = getFunc(`${config.onAccountLinked}`);
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
                        ...(p.override ? { override: getFunc(`${p.override}`) } : {}),
                    })),
                };
            }
            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    ...(config?.override.apis ? { apis: getFunc(`${config?.override.apis}`) } : {}),
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
                    override: getFunc(`${config?.emailDelivery.override}`),
                };
            }
            if (config?.getEmailForRecipeUserId) {
                init.getEmailForRecipeUserId = getFunc(`${config?.getEmailForRecipeUserId}`);
            }
            if (config?.override?.functions) {
                init.override = {
                    ...init.override,
                    functions: getFunc(`${config?.override.functions}`),
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
                        sendEmail: getFunc(`${config?.emailDelivery?.service?.sendEmail}`),
                    },
                };
            }
            if (config?.smsDelivery?.service?.sendSms) {
                init.smsDelivery = {
                    ...config?.smsDelivery,
                    service: {
                        ...config?.smsDelivery?.service,
                        sendSms: getFunc(`${config?.smsDelivery?.service?.sendSms}`),
                    },
                };
            }
            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    ...(config?.override.apis ? { apis: getFunc(`${config?.override.apis}`) } : {}),
                };
            }
            recipeList.push(Passwordless.init(init));
        }
        if (recipe.recipeId === "multifactorauth") {
            let initConfig: MFATypeInput = {
                ...config,
            };
            if (initConfig.override?.functions) {
                initConfig.override = {
                    ...initConfig.override,
                    functions: getFunc(`${initConfig.override.functions}`),
                };
            }
            if (initConfig.override?.apis) {
                initConfig.override = {
                    ...initConfig.override,
                    apis: getFunc(`${initConfig.override.apis}`),
                };
            }
            recipeList.push(MultiFactorAuth.init(initConfig));
        }
        if (recipe.recipeId === "totp") {
            recipeList.push(TOTP.init(config));
        }
        if (recipe.recipeId === "oauth2") {
            let initConfig: OAuth2TypeInput = {
                ...config,
            };
            if (initConfig.override?.functions) {
                initConfig.override = {
                    ...initConfig.override,
                    functions: getFunc(`${initConfig.override.functions}`),
                };
            }
            if (initConfig.override?.apis) {
                initConfig.override = {
                    ...initConfig.override,
                    apis: getFunc(`${initConfig.override.apis}`),
                };
            }
            recipeList.push(OAuth2.init(initConfig));
        }
    });

    settings.recipeList = recipeList;

    if (settings.supertokens?.networkInterceptor) {
        settings.supertokens.networkInterceptor = getFunc(`${settings.supertokens.networkInterceptor}`);
    }

    supertokens.init(settings);
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    logDebugMessage(req.method, req.path);
    next();
});
app.use(middleware());

app.get("/test/ping", async (req, res, next) => {
    res.json({ ok: true });
});

app.post("/test/init", async (req, res, next) => {
    try {
        initST(req.body.config);
        res.json({ ok: true });
    } catch (err) {
        defaultSTInit();
        next(err);
    }
});

app.get("/test/overrideparams", async (req, res, next) => {
    res.json(getOverrideParams());
});

app.get("/test/featureflag", async (req, res, next) => {
    res.json([]);
});

app.post("/test/resetoverrideparams", async (req, res, next) => {
    resetOverrideParams();
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
        if (!req.query.event) {
            throw new Error("event query param missing");
        }
        const eventEnum = Number(req.query.event);
        if (isNaN(eventEnum)) {
            throw new Error("event query param is not a number");
        }
        const instance = ProcessState.getInstance();
        const event = await instance.waitForEvent(eventEnum);
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
app.use("/test/usermetadata", userMetadataRoutes);
app.use("/test/oauth2", oAuth2Routes);

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

app.use((req, res, next) => {
    res.status(404).send(`node-test-server: route not found ${req.method} ${req.path}`);
    if (process.env.NODE_ENV === "development") {
        throw new Error(`node-test-server: route not found ${req.method} ${req.path}`);
    }
});

app.use(errorHandler());

app.use((err, req, res, next) => {
    logDebugMessage(err);
    res.status(500).json({ ...err, message: err.message });
});

app.listen(API_PORT, "localhost", () => {
    logDebugMessage(`node-test-server-server started on localhost:${API_PORT}`);
});
