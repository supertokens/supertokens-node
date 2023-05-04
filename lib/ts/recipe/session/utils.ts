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

import {
    TypeInput,
    TypeNormalisedInput,
    NormalisedErrorHandlers,
    ClaimValidationError,
    SessionClaimValidator,
    SessionContainerInterface,
    VerifySessionOptions,
    TokenTransferMethod,
} from "./types";
import { setFrontTokenInHeaders, setToken, getAuthModeFromHeader } from "./cookieAndHeaders";
import SessionRecipe from "./recipe";
import { REFRESH_API_PATH, hundredYearsInMs } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { NormalisedAppinfo } from "../../types";
import { isAnIpAddress } from "../../utils";
import { RecipeInterface, APIInterface } from "./types";
import { BaseRequest, BaseResponse } from "../../framework";
import { sendNon200ResponseWithMessage, sendNon200Response } from "../../utils";
import { logDebugMessage } from "../../logger";

export async function sendTryRefreshTokenResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    sendNon200ResponseWithMessage(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
}

export async function sendUnauthorisedResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    sendNon200ResponseWithMessage(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
}

export async function sendInvalidClaimResponse(
    recipeInstance: SessionRecipe,
    claimValidationErrors: ClaimValidationError[],
    __: BaseRequest,
    response: BaseResponse
) {
    sendNon200Response(response, recipeInstance.config.invalidClaimStatusCode, {
        message: "invalid claim",
        claimValidationErrors,
    });
}

export async function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    await recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle, userContext: {} });
    sendNon200ResponseWithMessage(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
}

export function normaliseSessionScopeOrThrowError(sessionScope: string): string {
    function helper(sessionScope: string): string {
        sessionScope = sessionScope.trim().toLowerCase();

        // first we convert it to a URL so that we can use the URL class
        if (sessionScope.startsWith(".")) {
            sessionScope = sessionScope.substr(1);
        }

        if (!sessionScope.startsWith("http://") && !sessionScope.startsWith("https://")) {
            sessionScope = "http://" + sessionScope;
        }

        try {
            let urlObj = new URL(sessionScope);
            sessionScope = urlObj.hostname;

            // remove leading dot
            if (sessionScope.startsWith(".")) {
                sessionScope = sessionScope.substr(1);
            }

            return sessionScope;
        } catch (err) {
            throw new Error("Please provide a valid sessionScope");
        }
    }

    let noDotNormalised = helper(sessionScope);

    if (noDotNormalised === "localhost" || isAnIpAddress(noDotNormalised)) {
        return noDotNormalised;
    }

    if (sessionScope.startsWith(".")) {
        return "." + noDotNormalised;
    }

    return noDotNormalised;
}

export function getURLProtocol(url: string): string {
    let urlObj = new URL(url);
    return urlObj.protocol;
}

export function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(config.cookieDomain);

    let protocolOfAPIDomain = getURLProtocol(appInfo.apiDomain.getAsStringDangerous());
    let protocolOfWebsiteDomain = getURLProtocol(appInfo.websiteDomain.getAsStringDangerous());

    let cookieSameSite: "strict" | "lax" | "none" =
        appInfo.topLevelAPIDomain !== appInfo.topLevelWebsiteDomain || protocolOfAPIDomain !== protocolOfWebsiteDomain
            ? "none"
            : "lax";
    cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? cookieSameSite
            : normaliseSameSiteOrThrowError(config.cookieSameSite);

    let cookieSecure =
        config === undefined || config.cookieSecure === undefined
            ? appInfo.apiDomain.getAsStringDangerous().startsWith("https")
            : config.cookieSecure;

    let sessionExpiredStatusCode =
        config === undefined || config.sessionExpiredStatusCode === undefined ? 401 : config.sessionExpiredStatusCode;
    const invalidClaimStatusCode = config?.invalidClaimStatusCode ?? 403;

    if (sessionExpiredStatusCode === invalidClaimStatusCode) {
        throw new Error("sessionExpiredStatusCode and sessionExpiredStatusCode must be different");
    }

    if (config !== undefined && config.antiCsrf !== undefined) {
        if (config.antiCsrf !== "NONE" && config.antiCsrf !== "VIA_CUSTOM_HEADER" && config.antiCsrf !== "VIA_TOKEN") {
            throw new Error("antiCsrf config must be one of 'NONE' or 'VIA_CUSTOM_HEADER' or 'VIA_TOKEN'");
        }
    }

    let antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE" =
        config === undefined || config.antiCsrf === undefined
            ? cookieSameSite === "none"
                ? "VIA_CUSTOM_HEADER"
                : "NONE"
            : config.antiCsrf;

    let errorHandlers: NormalisedErrorHandlers = {
        onTokenTheftDetected: async (
            sessionHandle: string,
            userId: string,
            request: BaseRequest,
            response: BaseResponse
        ) => {
            return await sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, userId, request, response);
        },
        onTryRefreshToken: async (message: string, request: BaseRequest, response: BaseResponse) => {
            return await sendTryRefreshTokenResponse(recipeInstance, message, request, response);
        },
        onUnauthorised: async (message: string, request: BaseRequest, response: BaseResponse) => {
            return await sendUnauthorisedResponse(recipeInstance, message, request, response);
        },
        onInvalidClaim: (validationErrors: ClaimValidationError[], request: BaseRequest, response: BaseResponse) => {
            return sendInvalidClaimResponse(recipeInstance, validationErrors, request, response);
        },
    };
    if (config !== undefined && config.errorHandlers !== undefined) {
        if (config.errorHandlers.onTokenTheftDetected !== undefined) {
            errorHandlers.onTokenTheftDetected = config.errorHandlers.onTokenTheftDetected;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
        if (config.errorHandlers.onInvalidClaim !== undefined) {
            errorHandlers.onInvalidClaim = config.errorHandlers.onInvalidClaim;
        }
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        useDynamicAccessTokenSigningKey: config?.useDynamicAccessTokenSigningKey ?? true,
        exposeAccessTokenToFrontendInCookieBasedAuth: config?.exposeAccessTokenToFrontendInCookieBasedAuth ?? false,
        refreshTokenPath: appInfo.apiBasePath.appendPath(new NormalisedURLPath(REFRESH_API_PATH)),
        getTokenTransferMethod:
            config?.getTokenTransferMethod === undefined
                ? defaultGetTokenTransferMethod
                : config.getTokenTransferMethod,
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        errorHandlers,
        antiCsrf,
        override,
        invalidClaimStatusCode,
    };
}

export function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none" {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new Error(`cookie same site must be one of "strict", "lax", or "none"`);
    }
    return sameSite;
}

export function setAccessTokenInResponse(
    res: BaseResponse,
    accessToken: string,
    frontToken: string,
    config: TypeNormalisedInput,
    transferMethod: TokenTransferMethod
) {
    setFrontTokenInHeaders(res, frontToken);
    setToken(
        config,
        res,
        "access",
        accessToken,
        // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
        // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
        // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
        // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
        Date.now() + hundredYearsInMs,
        transferMethod
    );

    if (config.exposeAccessTokenToFrontendInCookieBasedAuth && transferMethod === "cookie") {
        setToken(
            config,
            res,
            "access",
            accessToken,
            // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
            // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
            // Even if the token is expired the presence of the token indicates that the user could have a valid refresh token
            // Setting them to infinity would require special case handling on the frontend and just adding 100 years seems enough.
            Date.now() + hundredYearsInMs,
            "header"
        );
    }
}

export async function getRequiredClaimValidators(
    session: SessionContainerInterface,
    overrideGlobalClaimValidators: VerifySessionOptions["overrideGlobalClaimValidators"],
    userContext: any
) {
    const claimValidatorsAddedByOtherRecipes = SessionRecipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes();
    const globalClaimValidators: SessionClaimValidator[] = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getGlobalClaimValidators(
        {
            userId: session.getUserId(),
            claimValidatorsAddedByOtherRecipes,
            userContext,
        }
    );

    return overrideGlobalClaimValidators !== undefined
        ? await overrideGlobalClaimValidators(globalClaimValidators, session, userContext)
        : globalClaimValidators;
}

export async function validateClaimsInPayload(
    claimValidators: SessionClaimValidator[],
    newAccessTokenPayload: any,
    userContext: any
) {
    const validationErrors = [];
    for (const validator of claimValidators) {
        const claimValidationResult = await validator.validate(newAccessTokenPayload, userContext);
        logDebugMessage(
            "validateClaimsInPayload " + validator.id + " validation res " + JSON.stringify(claimValidationResult)
        );
        if (!claimValidationResult.isValid) {
            validationErrors.push({
                id: validator.id,
                reason: claimValidationResult.reason,
            });
        }
    }
    return validationErrors;
}

function defaultGetTokenTransferMethod({
    req,
    forCreateNewSession,
}: {
    req: BaseRequest;
    forCreateNewSession: boolean;
}): TokenTransferMethod | "any" {
    // We allow fallback (checking headers then cookies) by default when validating
    if (!forCreateNewSession) {
        return "any";
    }

    // In create new session we respect the frontend preference by default
    switch (getAuthModeFromHeader(req)) {
        case "header":
            return "header";
        case "cookie":
            return "cookie";
        default:
            return "any";
    }
}
