"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionFromRequest = getSessionFromRequest;
exports.getAccessTokenFromRequest = getAccessTokenFromRequest;
exports.refreshSessionInRequest = refreshSessionInRequest;
exports.createNewSessionInRequest = createNewSessionInRequest;
const framework_1 = __importDefault(require("../../framework"));
const supertokens_1 = __importDefault(require("../../supertokens"));
const recipe_1 = __importDefault(require("../openid/recipe"));
const utils_1 = require("./utils");
const utils_2 = require("../../utils");
const logger_1 = require("../../logger");
const constants_1 = require("./constants");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const jwt_1 = require("./jwt");
const accessToken_1 = require("./accessToken");
const error_1 = __importDefault(require("./error"));
// We are defining this here (and not exporting it) to reduce the scope of legacy code
const LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME = "sIdRefreshToken";
async function getSessionFromRequest({ req, res, config, recipeInterfaceImpl, options, userContext }) {
    (0, logger_1.logDebugMessage)("getSession: Started");
    const configuredFramework = supertokens_1.default.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = framework_1.default[configuredFramework].wrapRequest(req);
        }
        if (!res.wrapperUsed) {
            res = framework_1.default[configuredFramework].wrapResponse(res);
        }
    }
    userContext = (0, utils_2.setRequestInUserContextIfNotDefined)(userContext, req);
    (0, logger_1.logDebugMessage)("getSession: Wrapping done");
    // This token isn't handled by getToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
        (0, logger_1.logDebugMessage)(
            "getSession: Throwing TRY_REFRESH_TOKEN because the request is using a legacy session"
        );
        // This could create a spike on refresh calls during the update of the backend SDK
        throw new error_1.default({
            message: "using legacy session, please call the refresh API",
            type: error_1.default.TRY_REFRESH_TOKEN,
        });
    }
    const sessionOptional = (options === null || options === void 0 ? void 0 : options.sessionRequired) === false;
    (0, logger_1.logDebugMessage)("getSession: optional validation: " + sessionOptional);
    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });
    const { requestTransferMethod, accessToken } = getAccessTokenFromRequest(
        config,
        req,
        allowedTransferMethod,
        userContext
    );
    let antiCsrfToken = (0, cookieAndHeaders_1.getAntiCsrfTokenFromHeaders)(req);
    let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;
    if (doAntiCsrfCheck === undefined) {
        doAntiCsrfCheck = (0, utils_2.normaliseHttpMethod)(req.getMethod()) !== "get";
    }
    if (requestTransferMethod === "header") {
        doAntiCsrfCheck = false;
    }
    // If the token is not present we can ignore the antiCsrf settings.
    // the getSession implementation will handle checking sessionOptional
    if (accessToken === undefined) {
        doAntiCsrfCheck = false;
    }
    let antiCsrf = config.antiCsrfFunctionOrString;
    if (typeof antiCsrf === "function") {
        antiCsrf = antiCsrf({
            request: req,
            userContext,
        });
    }
    if (doAntiCsrfCheck && antiCsrf === "VIA_CUSTOM_HEADER") {
        if (antiCsrf === "VIA_CUSTOM_HEADER") {
            if ((0, utils_2.getRidFromHeader)(req) === undefined) {
                (0, logger_1.logDebugMessage)(
                    "getSession: Returning TRY_REFRESH_TOKEN because custom header (rid) was not passed"
                );
                throw new error_1.default({
                    message:
                        "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request, or set doAntiCsrfCheck to false for this API",
                    type: error_1.default.TRY_REFRESH_TOKEN,
                });
            }
            (0, logger_1.logDebugMessage)("getSession: VIA_CUSTOM_HEADER anti-csrf check passed");
            doAntiCsrfCheck = false;
        }
    }
    (0, logger_1.logDebugMessage)("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);
    const session = await recipeInterfaceImpl.getSession({
        accessToken: accessToken === null || accessToken === void 0 ? void 0 : accessToken.rawTokenString,
        antiCsrfToken,
        options: Object.assign(Object.assign({}, options), { antiCsrfCheck: doAntiCsrfCheck }),
        userContext,
    });
    if (session !== undefined) {
        const claimValidators = await (0, utils_1.getRequiredClaimValidators)(
            session,
            options === null || options === void 0 ? void 0 : options.overrideGlobalClaimValidators,
            userContext
        );
        await session.assertClaims(claimValidators, userContext);
        // requestTransferMethod can only be undefined here if the user overridden getSession
        // to load the session by a custom method in that (very niche) case they also need to
        // override how the session is attached to the response.
        // In that scenario the transferMethod passed to attachToRequestResponse likely doesn't
        // matter, still, we follow the general fallback logic
        await session.attachToRequestResponse(
            {
                req,
                res,
                transferMethod:
                    requestTransferMethod !== undefined
                        ? requestTransferMethod
                        : allowedTransferMethod !== "any"
                        ? allowedTransferMethod
                        : "header",
            },
            userContext
        );
    }
    return session;
}
function getAccessTokenFromRequest(config, req, allowedTransferMethod, userContext) {
    const accessTokens = {};
    // We check all token transfer methods for available access tokens
    for (const transferMethod of constants_1.availableTokenTransferMethods) {
        const tokenString = (0, cookieAndHeaders_1.getToken)(config, req, "access", transferMethod, userContext);
        if (tokenString !== undefined) {
            try {
                const info = (0, jwt_1.parseJWTWithoutSignatureVerification)(tokenString);
                (0, accessToken_1.validateAccessTokenStructure)(info.payload, info.version);
                (0, logger_1.logDebugMessage)("getSession: got access token from " + transferMethod);
                accessTokens[transferMethod] = info;
            } catch (_a) {
                (0, logger_1.logDebugMessage)(
                    `getSession: ignoring token in ${transferMethod}, because it doesn't match our access token structure`
                );
            }
        }
    }
    let requestTransferMethod;
    let accessToken;
    if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
        accessTokens["header"] !== undefined
    ) {
        (0, logger_1.logDebugMessage)("getSession: using header transfer method");
        requestTransferMethod = "header";
        accessToken = accessTokens["header"];
    } else if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
        accessTokens["cookie"] !== undefined
    ) {
        (0, logger_1.logDebugMessage)("getSession: using cookie transfer method");
        // If multiple access tokens exist in the request cookie, throw TRY_REFRESH_TOKEN.
        // This prompts the client to call the refresh endpoint, clearing olderCookieDomain cookies (if set).
        // ensuring outdated token payload isn't used.
        const hasMultipleAccessTokenCookies = (0, cookieAndHeaders_1.hasMultipleCookiesForTokenType)(
            config,
            req,
            "access",
            userContext
        );
        if (hasMultipleAccessTokenCookies) {
            (0, logger_1.logDebugMessage)(
                "getSession: Throwing TRY_REFRESH_TOKEN because multiple access tokens are present in request cookies"
            );
            throw new error_1.default({
                message: "Multiple access tokens present in the request cookies.",
                type: error_1.default.TRY_REFRESH_TOKEN,
            });
        }
        requestTransferMethod = "cookie";
        accessToken = accessTokens["cookie"];
    }
    return { requestTransferMethod, accessToken, allowedTransferMethod };
}
/*
    In all cases: if sIdRefreshToken token exists (so it's a legacy session) we clear it.
    Check http://localhost:3002/docs/contribute/decisions/session/0008 for further details and a table of expected behaviours
*/
async function refreshSessionInRequest({ res, req, userContext, config, recipeInterfaceImpl }) {
    (0, logger_1.logDebugMessage)("refreshSession: Started");
    const configuredFramework = supertokens_1.default.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = framework_1.default[configuredFramework].wrapRequest(req);
        }
        if (!res.wrapperUsed) {
            res = framework_1.default[configuredFramework].wrapResponse(res);
        }
    }
    userContext = (0, utils_2.setRequestInUserContextIfNotDefined)(userContext, req);
    (0, logger_1.logDebugMessage)("refreshSession: Wrapping done");
    (0, cookieAndHeaders_1.clearSessionCookiesFromOlderCookieDomain)({ req, res, config, userContext });
    const refreshTokens = {};
    // We check all token transfer methods for available refresh tokens
    // We do this so that we can later clear all we are not overwriting
    for (const transferMethod of constants_1.availableTokenTransferMethods) {
        refreshTokens[transferMethod] = (0, cookieAndHeaders_1.getToken)(
            config,
            req,
            "refresh",
            transferMethod,
            userContext
        );
        if (refreshTokens[transferMethod] !== undefined) {
            (0, logger_1.logDebugMessage)("refreshSession: got refresh token from " + transferMethod);
        }
    }
    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });
    (0, logger_1.logDebugMessage)("refreshSession: getTokenTransferMethod returned " + allowedTransferMethod);
    let requestTransferMethod;
    let refreshToken;
    if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
        refreshTokens["header"] !== undefined
    ) {
        (0, logger_1.logDebugMessage)("refreshSession: using header transfer method");
        requestTransferMethod = "header";
        refreshToken = refreshTokens["header"];
    } else if ((allowedTransferMethod === "any" || allowedTransferMethod === "cookie") && refreshTokens["cookie"]) {
        (0, logger_1.logDebugMessage)("refreshSession: using cookie transfer method");
        requestTransferMethod = "cookie";
        refreshToken = refreshTokens["cookie"];
    } else {
        // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
        if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
            (0, logger_1.logDebugMessage)(
                "refreshSession: cleared legacy id refresh token because refresh token was not found"
            );
            (0, cookieAndHeaders_1.setCookie)(
                config,
                res,
                LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                "",
                0,
                "accessTokenPath",
                req,
                userContext
            );
        }
        // We need to clear the access token cookie if
        // - the refresh token is not found, and
        // - the allowedTransferMethod is 'cookie' or 'any', and
        // - an access token cookie exists (otherwise it'd be a no-op)
        // See: https://github.com/supertokens/supertokens-node/issues/790
        if (
            (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
            (0, cookieAndHeaders_1.getToken)(config, req, "access", "cookie", userContext) !== undefined
        ) {
            (0, logger_1.logDebugMessage)(
                "refreshSession: cleared all session tokens and returning UNAUTHORISED because refresh token in request is undefined"
            );
            // We're clearing all session tokens instead of just the access token and then throwing an UNAUTHORISED
            // error with `clearTokens: false`. This approach avoids confusion and we don't want to retain session
            // tokens on the client in any case if the refresh API is called without a refresh token but with an access token.
            throw new error_1.default({
                message: "Refresh token not found but access token is present. Clearing all tokens.",
                payload: {
                    clearTokens: true,
                },
                type: error_1.default.UNAUTHORISED,
            });
        }
        throw new error_1.default({
            message: "Refresh token not found. Are you sending the refresh token in the request?",
            payload: {
                clearTokens: true,
            },
            type: error_1.default.UNAUTHORISED,
        });
    }
    let disableAntiCsrf = requestTransferMethod === "header";
    const antiCsrfToken = (0, cookieAndHeaders_1.getAntiCsrfTokenFromHeaders)(req);
    let antiCsrf = config.antiCsrfFunctionOrString;
    if (typeof antiCsrf === "function") {
        antiCsrf = antiCsrf({
            request: req,
            userContext,
        });
    }
    if (antiCsrf === "VIA_CUSTOM_HEADER" && !disableAntiCsrf) {
        if ((0, utils_2.getRidFromHeader)(req) === undefined) {
            (0, logger_1.logDebugMessage)(
                "refreshSession: Returning UNAUTHORISED because custom header (rid) was not passed"
            );
            throw new error_1.default({
                message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                type: error_1.default.UNAUTHORISED,
                payload: {
                    clearTokens: true, // see https://github.com/supertokens/supertokens-node/issues/141
                },
            });
        }
        disableAntiCsrf = true;
    }
    let session;
    try {
        session = await recipeInterfaceImpl.refreshSession({
            refreshToken: refreshToken,
            antiCsrfToken,
            disableAntiCsrf,
            userContext,
        });
    } catch (ex) {
        if (
            error_1.default.isErrorFromSuperTokens(ex) &&
            (ex.type === error_1.default.TOKEN_THEFT_DETECTED || ex.payload.clearTokens === true)
        ) {
            // We clear the LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME here because we want to limit the scope of this legacy/migration code
            // so the token clearing functions in the error handlers do not
            if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                (0, logger_1.logDebugMessage)(
                    "refreshSession: cleared legacy id refresh token because refresh is clearing other tokens"
                );
                (0, cookieAndHeaders_1.setCookie)(
                    config,
                    res,
                    LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                    "",
                    0,
                    "accessTokenPath",
                    req,
                    userContext
                );
            }
        }
        throw ex;
    }
    (0, logger_1.logDebugMessage)("refreshSession: Attaching refreshed session info as " + requestTransferMethod);
    // We clear the tokens in all token transfer methods we are not going to overwrite
    for (const transferMethod of constants_1.availableTokenTransferMethods) {
        if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
            (0, cookieAndHeaders_1.clearSession)(config, res, transferMethod, req, userContext);
        }
    }
    await session.attachToRequestResponse(
        {
            req,
            res,
            transferMethod: requestTransferMethod,
        },
        userContext
    );
    (0, logger_1.logDebugMessage)("refreshSession: Success!");
    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
        (0, logger_1.logDebugMessage)("refreshSession: cleared legacy id refresh token after successful refresh");
        (0, cookieAndHeaders_1.setCookie)(
            config,
            res,
            LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
            "",
            0,
            "accessTokenPath",
            req,
            userContext
        );
    }
    return session;
}
async function createNewSessionInRequest({
    req,
    res,
    userContext,
    recipeInstance,
    accessTokenPayload,
    userId,
    recipeUserId,
    config,
    appInfo,
    sessionDataInDatabase,
    tenantId,
}) {
    (0, logger_1.logDebugMessage)("createNewSession: Started");
    const configuredFramework = supertokens_1.default.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = framework_1.default[configuredFramework].wrapRequest(req);
        }
        if (!res.wrapperUsed) {
            res = framework_1.default[configuredFramework].wrapResponse(res);
        }
    }
    (0, logger_1.logDebugMessage)("createNewSession: Wrapping done");
    userContext = (0, utils_2.setRequestInUserContextIfNotDefined)(userContext, req);
    const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
    const issuer = await recipe_1.default.getIssuer(userContext);
    let finalAccessTokenPayload = Object.assign(Object.assign({}, accessTokenPayload), { iss: issuer });
    for (const prop of constants_1.protectedProps) {
        delete finalAccessTokenPayload[prop];
    }
    for (const claim of claimsAddedByOtherRecipes) {
        const update = await claim.build(userId, recipeUserId, tenantId, finalAccessTokenPayload, userContext);
        finalAccessTokenPayload = Object.assign(Object.assign({}, finalAccessTokenPayload), update);
    }
    (0, logger_1.logDebugMessage)("createNewSession: Access token payload built");
    let outputTransferMethod = config.getTokenTransferMethod({ req, forCreateNewSession: true, userContext });
    if (outputTransferMethod === "any") {
        const authModeHeader = (0, cookieAndHeaders_1.getAuthModeFromHeader)(req);
        // We default to header if we can't "parse" it or if it's undefined
        if (authModeHeader === "cookie") {
            outputTransferMethod = authModeHeader;
        } else {
            outputTransferMethod = "header";
        }
    }
    (0, logger_1.logDebugMessage)("createNewSession: using transfer method " + outputTransferMethod);
    if (
        outputTransferMethod === "cookie" &&
        config.getCookieSameSite({
            request: req,
            userContext,
        }) === "none" &&
        !config.cookieSecure &&
        !(
            (appInfo.topLevelAPIDomain === "localhost" || (0, utils_2.isAnIpAddress)(appInfo.topLevelAPIDomain)) &&
            (appInfo.getTopLevelWebsiteDomain({
                request: req,
                userContext,
            }) === "localhost" ||
                (0, utils_2.isAnIpAddress)(
                    appInfo.getTopLevelWebsiteDomain({
                        request: req,
                        userContext,
                    })
                ))
        )
    ) {
        // We can allow insecure cookie when both website & API domain are localhost or an IP
        // When either of them is a different domain, API domain needs to have https and a secure cookie to work
        throw new Error(
            "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
        );
    }
    const disableAntiCsrf = outputTransferMethod === "header";
    const session = await recipeInstance.recipeInterfaceImpl.createNewSession({
        userId,
        recipeUserId,
        accessTokenPayload: finalAccessTokenPayload,
        sessionDataInDatabase,
        disableAntiCsrf,
        tenantId,
        userContext,
    });
    (0, logger_1.logDebugMessage)("createNewSession: Session created in core built");
    for (const transferMethod of constants_1.availableTokenTransferMethods) {
        if (
            transferMethod !== outputTransferMethod &&
            (0, cookieAndHeaders_1.getToken)(config, req, "access", transferMethod, userContext) !== undefined
        ) {
            (0, cookieAndHeaders_1.clearSession)(config, res, transferMethod, req, userContext);
        }
    }
    (0, logger_1.logDebugMessage)("createNewSession: Cleared old tokens");
    await session.attachToRequestResponse(
        {
            req,
            res,
            transferMethod: outputTransferMethod,
        },
        userContext
    );
    (0, logger_1.logDebugMessage)("createNewSession: Attached new tokens to res");
    return session;
}
