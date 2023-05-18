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
import {
    getRidFromHeader,
    getTopLevelDomainForSameSiteResolution,
    isAnIpAddress,
    normaliseHttpMethod,
    setRequestInUserContextIfNotDefined,
} from "../../utils";
import { logDebugMessage } from "../../logger";
import { availableTokenTransferMethods } from "./constants";
import { clearSession, getAntiCsrfTokenFromHeaders, getToken, setCookie } from "./cookieAndHeaders";
import { ParsedJWTInfo, parseJWTWithoutSignatureVerification } from "./jwt";
import { validateAccessTokenStructure } from "./accessToken";
import { NormalisedAppinfo } from "../../types";
import SessionError from "./error";

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
    userContext?: any;
}): Promise<SessionContainerInterface | undefined> {
    logDebugMessage("getSession: Started");
    if (!res.wrapperUsed) {
        res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
    }
    if (!req.wrapperUsed) {
        req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
    }
    userContext = setRequestInUserContextIfNotDefined(userContext, req);
    logDebugMessage("getSession: Wrapping done");

    // This token isn't handled by getToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
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
    let requestTransferMethod: TokenTransferMethod;
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
        requestTransferMethod = "cookie";
        accessToken = accessTokens["cookie"];
    } else {
        if (sessionOptional) {
            logDebugMessage(
                "getSession: returning undefined because accessToken is undefined and sessionRequired is false"
            );
            // there is no session that exists here, and the user wants session verification
            // to be optional. So we return undefined.
            return undefined;
        }

        logDebugMessage("getSession: UNAUTHORISED because accessToken in request is undefined");
        throw new SessionError({
            message:
                "Session does not exist. Are you sending the session tokens in the request with the appropriate token transfer method?",
            type: SessionError.UNAUTHORISED,
            payload: {
                // we do not clear the session here because of a
                // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17
                clearTokens: false,
            },
        });
    }

    let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
    let doAntiCsrfCheck = options !== undefined ? options.antiCsrfCheck : undefined;

    if (doAntiCsrfCheck === undefined) {
        doAntiCsrfCheck = normaliseHttpMethod(req.getMethod()) !== "get";
    }

    if (requestTransferMethod === "header") {
        doAntiCsrfCheck = false;
    }

    const antiCSRF = await config.antiCsrf(req, userContext);

    if (doAntiCsrfCheck && antiCSRF === "VIA_CUSTOM_HEADER") {
        if (antiCSRF === "VIA_CUSTOM_HEADER") {
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
        accessToken: accessToken.rawTokenString,
        antiCsrfToken,
        options: { ...options, antiCsrfCheck: doAntiCsrfCheck },
        antiCSRF,
        userContext,
    });

    if (session !== undefined) {
        const claimValidators = await getRequiredClaimValidators(
            session,
            options?.overrideGlobalClaimValidators,
            userContext
        );
        await session.assertClaims(claimValidators, userContext);

        await session.attachToRequestResponse({
            req,
            res,
            transferMethod: requestTransferMethod,
        });
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
    userContext: any;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
}) {
    logDebugMessage("refreshSession: Started");
    if (!res.wrapperUsed) {
        res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
    }
    if (!req.wrapperUsed) {
        req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
    }
    userContext = setRequestInUserContextIfNotDefined(userContext, req);
    logDebugMessage("refreshSession: Wrapping done");

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
            await setCookie(
                config,
                req,
                res,
                LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                "",
                0,
                "accessTokenPath",
                userContext
            );
        }

        logDebugMessage("refreshSession: UNAUTHORISED because refresh token in request is undefined");
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
    const antiCSRF = await config.antiCsrf(req, userContext);

    if (antiCSRF === "VIA_CUSTOM_HEADER" && !disableAntiCsrf) {
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
        const antiCSRF = await config.antiCsrf(req, userContext);
        session = await recipeInterfaceImpl.refreshSession({
            refreshToken: refreshToken,
            antiCsrfToken,
            disableAntiCsrf,
            antiCSRF,
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
                await setCookie(
                    config,
                    req,
                    res,
                    LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME,
                    "",
                    0,
                    "accessTokenPath",
                    userContext
                );
            }
        }
        throw ex;
    }
    logDebugMessage("refreshSession: Attaching refreshed session info as " + requestTransferMethod);

    // We clear the tokens in all token transfer methods we are not going to overwrite
    for (const transferMethod of availableTokenTransferMethods) {
        if (transferMethod !== requestTransferMethod && refreshTokens[transferMethod] !== undefined) {
            clearSession(config, req, res, transferMethod, userContext);
        }
    }
    await session.attachToRequestResponse({
        req,
        res,
        transferMethod: requestTransferMethod,
    });

    logDebugMessage("refreshSession: Success!");

    // This token isn't handled by getToken/setToken to limit the scope of this legacy/migration code
    if (req.getCookieValue(LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME) !== undefined) {
        logDebugMessage("refreshSession: cleared legacy id refresh token after successful refresh");
        await setCookie(config, req, res, LEGACY_ID_REFRESH_TOKEN_COOKIE_NAME, "", 0, "accessTokenPath", userContext);
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
    config,
    appInfo,
    sessionDataInDatabase,
}: {
    req: any;
    res: any;
    userContext: any;
    recipeInstance: Recipe;
    accessTokenPayload: any;
    userId: string;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    sessionDataInDatabase: any;
}) {
    logDebugMessage("createNewSession: Started");
    if (!req.wrapperUsed) {
        req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
    }

    if (!res.wrapperUsed) {
        res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
    }
    logDebugMessage("createNewSession: Wrapping done");
    userContext = setRequestInUserContextIfNotDefined(userContext, req);

    const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
    const issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();

    let finalAccessTokenPayload = {
        ...accessTokenPayload,
        iss: issuer,
    };

    for (const claim of claimsAddedByOtherRecipes) {
        const update = await claim.build(userId, userContext);
        finalAccessTokenPayload = {
            ...finalAccessTokenPayload,
            ...update,
        };
    }
    logDebugMessage("createNewSession: Access token payload built");

    let outputTransferMethod = config.getTokenTransferMethod({ req, forCreateNewSession: true, userContext });
    if (outputTransferMethod === "any") {
        outputTransferMethod = "header";
    }
    logDebugMessage("createNewSession: using transfer method " + outputTransferMethod);
    const cookieSameSite = await config.cookieSameSite(req, userContext);
    const origin = await appInfo.origin(req, userContext);
    const topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(origin.getAsStringDangerous());

    if (
        outputTransferMethod === "cookie" &&
        cookieSameSite === "none" &&
        !config.cookieSecure &&
        !(
            (appInfo.topLevelAPIDomain === "localhost" || isAnIpAddress(appInfo.topLevelAPIDomain)) &&
            (topLevelWebsiteDomain === "localhost" || isAnIpAddress(topLevelWebsiteDomain))
        )
    ) {
        // We can allow insecure cookie when both website & API domain are localhost or an IP
        // When either of them is a different domain, API domain needs to have https and a secure cookie to work
        throw new Error(
            "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
        );
    }
    const disableAntiCsrf = outputTransferMethod === "header";
    const antiCSRF = await config.antiCsrf(req, userContext);
    const session = await recipeInstance.recipeInterfaceImpl.createNewSession({
        userId,
        accessTokenPayload: finalAccessTokenPayload,
        sessionDataInDatabase,
        disableAntiCsrf,
        antiCSRF,
        userContext,
    });

    logDebugMessage("createNewSession: Session created in core built");

    for (const transferMethod of availableTokenTransferMethods) {
        if (transferMethod !== outputTransferMethod && getToken(req, "access", transferMethod) !== undefined) {
            clearSession(config, req, res, transferMethod, userContext);
        }
    }
    logDebugMessage("createNewSession: Cleared old tokens");

    await session.attachToRequestResponse({
        req,
        res,
        transferMethod: outputTransferMethod,
    });
    logDebugMessage("createNewSession: Attached new tokens to res");

    return session;
}
