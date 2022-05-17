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
    CreateOrRefreshAPIResponse,
    TypeInput,
    TypeNormalisedInput,
    NormalisedErrorHandlers,
    ClaimValidationError,
} from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
    setInvalidClaimHeader,
} from "./cookieAndHeaders";
import { URL } from "url";
import SessionRecipe from "./recipe";
import { REFRESH_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { NormalisedAppinfo } from "../../types";
import * as psl from "psl";
import { isAnIpAddress } from "../../utils";
import { RecipeInterface, APIInterface } from "./types";
import { BaseRequest, BaseResponse } from "../../framework";
import { sendNon200Response } from "../../utils";
import { ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY, JWT_RESERVED_KEY_USE_ERROR_MESSAGE } from "./with-jwt/constants";

export async function sendTryRefreshTokenResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    sendNon200Response(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
}

export async function sendUnauthorisedResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    sendNon200Response(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
}

export async function sendInvalidClaimResponse(
    recipeInstance: SessionRecipe,
    validationError: ClaimValidationError,
    __: BaseRequest,
    response: BaseResponse
) {
    setInvalidClaimHeader(response, JSON.stringify(validationError));
    sendNon200Response(response, "invalid claim", recipeInstance.config.missingClaimStatusCode);
}

export async function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    _: string,
    __: BaseRequest,
    response: BaseResponse
) {
    await recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle, userContext: {} });
    sendNon200Response(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
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

export function getTopLevelDomainForSameSiteResolution(url: string): string {
    let urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || hostname.startsWith("localhost.org") || isAnIpAddress(hostname)) {
        // we treat these as the same TLDs since we can use sameSite lax for all of them.
        return "localhost";
    }
    let parsedURL = psl.parse(hostname) as psl.ParsedDomain;
    if (parsedURL.domain === null) {
        throw new Error("Please make sure that the apiDomain and websiteDomain have correct values");
    }
    return parsedURL.domain;
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

    let topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(appInfo.apiDomain.getAsStringDangerous());
    let topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(appInfo.websiteDomain.getAsStringDangerous());

    let protocolOfAPIDomain = getURLProtocol(appInfo.apiDomain.getAsStringDangerous());
    let protocolOfWebsiteDomain = getURLProtocol(appInfo.websiteDomain.getAsStringDangerous());

    let cookieSameSite: "strict" | "lax" | "none" =
        topLevelAPIDomain !== topLevelWebsiteDomain || protocolOfAPIDomain !== protocolOfWebsiteDomain ? "none" : "lax";
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
        onInvalidClaim: (validationError: ClaimValidationError, request: BaseRequest, response: BaseResponse) => {
            return sendInvalidClaimResponse(recipeInstance, validationError, request, response);
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

    if (
        cookieSameSite === "none" &&
        !cookieSecure &&
        !(topLevelAPIDomain === "localhost" || isAnIpAddress(topLevelAPIDomain)) &&
        !(topLevelWebsiteDomain === "localhost" || isAnIpAddress(topLevelWebsiteDomain))
    ) {
        throw new Error(
            "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
        );
    }

    let enableJWT = false;
    let accessTokenPayloadJWTPropertyName = "jwt";
    let issuer: string | undefined;

    if (config !== undefined && config.jwt !== undefined && config.jwt.enable === true) {
        enableJWT = true;
        let jwtPropertyName = config.jwt.propertyNameInAccessTokenPayload;
        issuer = config.jwt.issuer;

        if (jwtPropertyName !== undefined) {
            if (jwtPropertyName === ACCESS_TOKEN_PAYLOAD_JWT_PROPERTY_NAME_KEY) {
                throw new Error(JWT_RESERVED_KEY_USE_ERROR_MESSAGE);
            }

            accessTokenPayloadJWTPropertyName = jwtPropertyName;
        }
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        refreshTokenPath: appInfo.apiBasePath.appendPath(new NormalisedURLPath(REFRESH_API_PATH)),
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        errorHandlers,
        antiCsrf,
        override,
        claimsToAddOnCreation: config?.claimsToAddOnCreation ?? [],
        defaultValidatorsForVerification: config?.defaultValidatorsForVerification ?? [],
        missingClaimStatusCode: config?.missingClaimStatusCode ?? 403,
        jwt: {
            enable: enableJWT,
            propertyNameInAccessTokenPayload: accessTokenPayloadJWTPropertyName,
            issuer,
        },
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

export function attachCreateOrRefreshSessionResponseToExpressRes(
    config: TypeNormalisedInput,
    res: BaseResponse,
    response: CreateOrRefreshAPIResponse
) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    setFrontTokenInHeaders(res, response.session.userId, response.accessToken.expiry, response.session.userDataInJWT);
    attachAccessTokenToCookie(config, res, accessToken.token, accessToken.expiry);
    attachRefreshTokenToCookie(config, res, refreshToken.token, refreshToken.expiry);
    setIdRefreshTokenInHeaderAndCookie(config, res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }
}
