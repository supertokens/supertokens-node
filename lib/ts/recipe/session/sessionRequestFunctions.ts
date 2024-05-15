import Recipe from "./recipe";
import {
    VerifySessionOptions,
    RecipeInterface,
    TokenTransferMethod,
    TypeNormalisedInput,
    SessionContainerInterface,
} from "./types";
import frameworks from "../../framework";
import SuperTokens from "../../supertokens";
import { getRequiredClaimValidators } from "./utils";
import { getRidFromHeader, isAnIpAddress, normaliseHttpMethod, setRequestInUserContextIfNotDefined } from "../../utils";
import { logDebugMessage } from "../../logger";
import { availableTokenTransferMethods, protectedProps } from "./constants";
import {
    clearSession,
    clearSessionCookiesFromOlderCookieDomain,
    getAntiCsrfTokenFromHeaders,
    getAuthModeFromHeader,
    getToken,
    hasMultipleCookiesForTokenType,
    setCookie,
} from "./cookieAndHeaders";
import { ParsedJWTInfo, parseJWTWithoutSignatureVerification } from "./jwt";
import { validateAccessTokenStructure } from "./accessToken";
import { NormalisedAppinfo, UserContext } from "../../types";
import SessionError from "./error";
import RecipeUserId from "../../recipeUserId";

// We are defining this here (and not exporting it) to reduce the scope of legacy code
const LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME = "sIdRefreshToken";

export async function getSessionFromRequest({
    req,
    res,
    config,
    recipeInterfaceImpl,
    options,
    userContext,
}: {
    req: any;
    res: any;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    options?: VerifySessionOptions;
    userContext: UserContext;
}): Promise<SessionContainerInterface | undefined> {
    logDebugMessage("getSession: Started");

    const configuredFramework = SuperTokens.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = frameworks[configuredFramework].wrapRequest(req);
        }

        if (!res.wrapperUsed) {
            res = frameworks[configuredFramework].wrapResponse(res);
        }
    }
    userContext = setRequestInUserContextIfNotDefined(userContext, req);
    logDebugMessage("getSession: Wrapping done");

    // This token isn't handled by getToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
        logDebugMessage("getSession: Throwing TRY_REFRESH_TOKEN because the request is using a legacy session");
        // This could create a spike on refresh calls during the update of the backend SDK
        throw new SessionError({
            message: "using legacy session, please call the refresh API",
            type: SessionError.TRY_REFRESH_TOKEN,
        });
    }

    const sessionOptional = options?.sessionRequired === false;
    logDebugMessage("getSession: optional validation: " + sessionOptional);

    const accessTokens: {
        [key in TokenTransferMethod]?: ParsedJWTInfo;
    } = {};

    // We check all token transfer methods for available access tokens
    for (const transferMethod of availableTokenTransferMethods) {
        const tokenString = getToken(req, "access", transferMethod);
        if (tokenString !== undefined) {
            try {
                const info = parseJWTWithoutSignatureVerification(tokenString);
                validateAccessTokenStructure(info.payload, info.version);
                logDebugMessage("getSession: got access token from " + transferMethod);
                accessTokens[transferMethod] = info;
            } catch {
                logDebugMessage(
                    `getSession: ignoring token in ${transferMethod}, because it doesn't match our access token structure`
                );
            }
        }
    }

    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });
    let requestTransferMethod: TokenTransferMethod | undefined;
    let accessToken: ParsedJWTInfo | undefined;

    if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
        accessTokens["header"] !== undefined
    ) {
        logDebugMessage("getSession: using header transfer method");
        requestTransferMethod = "header";
        accessToken = accessTokens["header"];
    } else if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
        accessTokens["cookie"] !== undefined
    ) {
        logDebugMessage("getSession: using cookie transfer method");

        // If multiple access tokens exist in the request cookie, throw TRY_REFRESH_TOKEN.
        // This prompts the client to call the refresh endpoint, clearing olderCookieDomain cookies (if set).
        // ensuring outdated token payload isn't used.
        const hasMultipleAccessTokenCookies = hasMultipleCookiesForTokenType(req, "access");
        if (hasMultipleAccessTokenCookies) {
            logDebugMessage(
                "getSession: Throwing TRY_REFRESH_TOKEN because multiple access tokens are present in request cookies"
            );
            throw new SessionError({
                message: "Multiple access tokens present in the request cookies.",
                type: SessionError.TRY_REFRESH_TOKEN,
            });
        }

        requestTransferMethod = "cookie";
        accessToken = accessTokens["cookie"];
    }

    let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
    let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

    if (doAntiCsrfCheck === undefined) {
        doAntiCsrfCheck = normaliseHttpMethod(req.getMethod()) !== "get";
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
            if (getRidFromHeader(req) === undefined) {
                logDebugMessage("getSession: Returning TRY_REFRESH_TOKEN because custom header (rid) was not passed");
                throw new SessionError({
                    message:
                        "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request, or set doAntiCsrfCheck to false for this API",
                    type: SessionError.TRY_REFRESH_TOKEN,
                });
            }
            logDebugMessage("getSession: VIA_CUSTOM_HEADER anti-csrf check passed");
            doAntiCsrfCheck = false;
        }
    }

    logDebugMessage("getSession: Value of doAntiCsrfCheck is: " + doAntiCsrfCheck);
    const session = await recipeInterfaceImpl.getSession({
        accessToken: accessToken?.rawTokenString,
        antiCsrfToken,
        options: { ...options, antiCsrfCheck: doAntiCsrfCheck },
        userContext,
    });

    if (session !== undefined) {
        const claimValidators = await getRequiredClaimValidators(
            session,
            options?.overrideGlobalClaimValidators,
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

/*
    In all cases: if sIdRefreshToken token exists (so it's a legacy session) we clear it.
    Check http://localhost:3002/docs/contribute/decisions/session/0008 for further details and a table of expected behaviours
*/
export async function refreshSessionInRequest({
    res,
    req,
    userContext,
    config,
    recipeInterfaceImpl,
}: {
    res: any;
    req: any;
    userContext: UserContext;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
}) {
    logDebugMessage("refreshSession: Started");
    const configuredFramework = SuperTokens.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = frameworks[configuredFramework].wrapRequest(req);
        }

        if (!res.wrapperUsed) {
            res = frameworks[configuredFramework].wrapResponse(res);
        }
    }
    userContext = setRequestInUserContextIfNotDefined(userContext, req);
    logDebugMessage("refreshSession: Wrapping done");

    clearSessionCookiesFromOlderCookieDomain({ req, res, config, userContext });

    const refreshTokens: {
        [key in TokenTransferMethod]?: string;
    } = {};

    // We check all token transfer methods for available refresh tokens
    // We do this so that we can later clear all we are not overwriting
    for (const transferMethod of availableTokenTransferMethods) {
        refreshTokens[transferMethod] = getToken(req, "refresh", transferMethod);
        if (refreshTokens[transferMethod] !== undefined) {
            logDebugMessage("refreshSession: got refresh token from " + transferMethod);
        }
    }

    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });
    logDebugMessage("refreshSession: getTokenTransferMethod returned " + allowedTransferMethod);

    let requestTransferMethod: TokenTransferMethod;
    let refreshToken: string | undefined;

    if (
        (allowedTransferMethod === "any" || allowedTransferMethod === "header") &&
        refreshTokens["header"] !== undefined
    ) {
        logDebugMessage("refreshSession: using header transfer method");
        requestTransferMethod = "header";
        refreshToken = refreshTokens["header"];
    } else if ((allowedTransferMethod === "any" || allowedTransferMethod === "cookie") && refreshTokens["cookie"]) {
        logDebugMessage("refreshSession: using cookie transfer method");
        requestTransferMethod = "cookie";
        refreshToken = refreshTokens["cookie"];
    } else {
        // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
        if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
            logDebugMessage("refreshSession: cleared legacy id refresh token because refresh token was not found");
            setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath", req, userContext);
        }

        // We need to clear the access token cookie if
        // - the refresh token is not found, and
        // - the allowedTransferMethod is 'cookie' or 'any', and
        // - an access token cookie exists (otherwise it'd be a no-op)
        // See: https://github.com/supertokens/supertokens-node/issues/790
        if (
            (allowedTransferMethod === "any" || allowedTransferMethod === "cookie") &&
            getToken(req, "access", "cookie") !== undefined
        ) {
            logDebugMessage(
                "refreshSession: cleared all session tokens and returning UNAUTHORISED because refresh token in request is undefined"
            );

            // We're clearing all session tokens instead of just the access token and then throwing an UNAUTHORISED
            // error with `clearTokens: false`. This approach avoids confusion and we don't want to retain session
            // tokens on the client in any case if the refresh API is called without a refresh token but with an access token.
            throw new SessionError({
                message: "Refresh token not found but access token is present. Clearing all tokens.",
                payload: {
                    clearTokens: true,
                },
                type: SessionError.UNAUTHORISED,
            });
        }

        throw new SessionError({
            message: "Refresh token not found. Are you sending the refresh token in the request?",
            payload: {
                clearTokens: false,
            },
            type: SessionError.UNAUTHORISED,
        });
    }
    let disableAntiCsrf = requestTransferMethod === "header";
    const antiCsrfToken = getAntiCsrfTokenFromHeaders(req);

    let antiCsrf = config.antiCsrfFunctionOrString;

    if (typeof antiCsrf === "function") {
        antiCsrf = antiCsrf({
            request: req,
            userContext,
        });
    }

    if (antiCsrf === "VIA_CUSTOM_HEADER" && !disableAntiCsrf) {
        if (getRidFromHeader(req) === undefined) {
            logDebugMessage("refreshSession: Returning UNAUTHORISED because custom header (rid) was not passed");
            throw new SessionError({
                message: "anti-csrf check failed. Please pass 'rid: \"session\"' header in the request.",
                type: SessionError.UNAUTHORISED,
                payload: {
                    clearTokens: false, // see https://github.com/supertokens/supertokens-node/issues/141
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
            SessionError.isErrorFromSuperTokens(ex) &&
            (ex.type === SessionError.TOKEN_THEFT_DETECTED || ex.payload.clearTokens === true)
        ) {
            // We clear the LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME here because we want to limit the scope of this legacy/migration code
            // so the token clearing functions in the error handlers do not
            if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
                logDebugMessage(
                    "refreshSession: cleared legacy id refresh token because refresh is clearing other tokens"
                );
                setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath", req, userContext);
            }
        }
        throw ex;
    }
    logDebugMessage("refreshSession: Attaching refreshed session info as " + requestTransferMethod);

    // We clear the tokens in all token transfer methods we are not going to overwrite
    for (const transferMethod of availableTokenTransferMethods) {
        if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
            clearSession(config, res, transferMethod, req, userContext);
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

    logDebugMessage("refreshSession: Success!");

    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
        logDebugMessage("refreshSession: cleared legacy id refresh token after successful refresh");
        setCookie(config, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath", req, userContext);
    }

    return session;
}

export async function createNewSessionInRequest({
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
}: {
    req: any;
    res: any;
    userContext: UserContext;
    recipeInstance: Recipe;
    accessTokenPayload: any;
    userId: string;
    recipeUserId: RecipeUserId;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
    tenantId: string;
}) {
    logDebugMessage("createNewSession: Started");
    const configuredFramework = SuperTokens.getInstanceOrThrowError().framework;
    if (configuredFramework !== "custom") {
        if (!req.wrapperUsed) {
            req = frameworks[configuredFramework].wrapRequest(req);
        }

        if (!res.wrapperUsed) {
            res = frameworks[configuredFramework].wrapResponse(res);
        }
    }

    logDebugMessage("createNewSession: Wrapping done");
    userContext = setRequestInUserContextIfNotDefined(userContext, req);

    const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
    const issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();

    let finalAccessTokenPayload = {
        ...accessTokenPayload,
        iss: issuer,
    };

    for (const prop of protectedProps) {
        delete finalAccessTokenPayload[prop];
    }

    for (const claim of claimsAddedByOtherRecipes) {
        const update = await claim.build(userId, recipeUserId, tenantId, finalAccessTokenPayload, userContext);
        finalAccessTokenPayload = {
            ...finalAccessTokenPayload,
            ...update,
        };
    }
    logDebugMessage("createNewSession: Access token payload built");

    let outputTransferMethod = config.getTokenTransferMethod({ req, forCreateNewSession: true, userContext });
    if (outputTransferMethod === "any") {
        const authModeHeader = getAuthModeFromHeader(req);
        // We default to header if we can't "parse" it or if it's undefined
        if (authModeHeader === "cookie") {
            outputTransferMethod = authModeHeader;
        } else {
            outputTransferMethod = "header";
        }
    }
    logDebugMessage("createNewSession: using transfer method " + outputTransferMethod);

    if (
        outputTransferMethod === "cookie" &&
        config.getCookieSameSite({
            request: req,
            userContext,
        }) === "none" &&
        !config.cookieSecure &&
        !(
            (appInfo.topLevelAPIDomain === "localhost" || isAnIpAddress(appInfo.topLevelAPIDomain)) &&
            (appInfo.getTopLevelWebsiteDomain({
                request: req,
                userContext,
            }) === "localhost" ||
                isAnIpAddress(
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

    logDebugMessage("createNewSession: Session created in core built");

    for (const transferMethod of availableTokenTransferMethods) {
        if (transferMethod !== outputTransferMethod && getToken(req, "access", transferMethod) !== undefined) {
            clearSession(config, res, transferMethod, req, userContext);
        }
    }
    logDebugMessage("createNewSession: Cleared old tokens");

    await session.attachToRequestResponse(
        {
            req,
            res,
            transferMethod: outputTransferMethod,
        },
        userContext
    );
    logDebugMessage("createNewSession: Attached new tokens to res");

    return session;
}
