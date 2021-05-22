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
    InputSchema,
} from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
} from "./cookieAndHeaders";
import * as express from "express";
import { URL } from "url";
import SessionRecipe from "./recipe";
import STError from "./error";
import {
    sendTryRefreshTokenResponse,
    sendTokenTheftDetectedResponse,
    sendUnauthorisedResponse,
} from "./api/middleware";
import { REFRESH_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { NormalisedAppinfo } from "../../types";
import * as psl from "psl";
import { isAnIpAddress, validateTheStructureOfUserInput } from "../../utils";
import { RecipeImplementation, RecipeInterface, APIImplementation, APIInterface } from "./";

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
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("Please provide a valid sessionScope"),
            });
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
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Please make sure that the apiDomain and websiteDomain have correct values"),
        });
    }
    return parsedURL.domain;
}

export function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "session recipe");
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(config.cookieDomain);

    let topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(appInfo.apiDomain.getAsStringDangerous());
    let topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(appInfo.websiteDomain.getAsStringDangerous());

    let cookieSameSite: "strict" | "lax" | "none" = topLevelAPIDomain !== topLevelWebsiteDomain ? "none" : "lax";
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

    let sessionRefreshFeature = {
        disableDefaultImplementation: false,
    };
    if (
        config !== undefined &&
        config.sessionRefreshFeature !== undefined &&
        config.sessionRefreshFeature.disableDefaultImplementation !== undefined
    ) {
        sessionRefreshFeature.disableDefaultImplementation = config.sessionRefreshFeature.disableDefaultImplementation;
    }

    let signOutFeature = {
        disableDefaultImplementation: false,
    };
    if (
        config !== undefined &&
        config.signOutFeature !== undefined &&
        config.signOutFeature.disableDefaultImplementation !== undefined
    ) {
        signOutFeature.disableDefaultImplementation = config.signOutFeature.disableDefaultImplementation;
    }

    if (config !== undefined && config.antiCsrf !== undefined) {
        if (config.antiCsrf !== "NONE" && config.antiCsrf !== "VIA_CUSTOM_HEADER" && config.antiCsrf !== "VIA_TOKEN") {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("antiCsrf config must be one of 'NONE' or 'VIA_CUSTOM_HEADER' or 'VIA_TOKEN'"),
            });
        }
    }

    let antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE" =
        config === undefined || config.antiCsrf === undefined
            ? cookieSameSite === "none"
                ? "VIA_CUSTOM_HEADER"
                : "NONE"
            : config.antiCsrf;

    let errorHandlers: NormalisedErrorHandlers = {
        onTokenTheftDetected: (
            sessionHandle: string,
            userId: string,
            request: express.Request,
            response: express.Response,
            next: express.NextFunction
        ) => {
            return sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, userId, request, response, next);
        },
        onTryRefreshToken: (
            message: string,
            request: express.Request,
            response: express.Response,
            next: express.NextFunction
        ) => {
            return sendTryRefreshTokenResponse(recipeInstance, message, request, response, next);
        },
        onUnauthorised: (
            message: string,
            request: express.Request,
            response: express.Response,
            next: express.NextFunction
        ) => {
            return sendUnauthorisedResponse(recipeInstance, message, request, response, next);
        },
    };
    if (config !== undefined && config.errorHandlers !== undefined) {
        if (config.errorHandlers.onTokenTheftDetected !== undefined) {
            errorHandlers.onTokenTheftDetected = config.errorHandlers.onTokenTheftDetected;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
    }

    if (
        cookieSameSite === "none" &&
        !cookieSecure &&
        !(topLevelAPIDomain === "localhost" || isAnIpAddress(topLevelAPIDomain)) &&
        !(topLevelWebsiteDomain === "localhost" || isAnIpAddress(topLevelWebsiteDomain))
    ) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error(
                "Since your API and website domain are different, for sessions to work, please use https on your apiDomain and dont set cookieSecure to false."
            ),
        });
    }

    let override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    } = {
        functions: (originalImplementation: RecipeImplementation) => originalImplementation,
        apis: (originalImplementation: APIImplementation) => originalImplementation,
    };

    if (config !== undefined && config.override !== undefined) {
        if (config.override.functions !== undefined) {
            override = {
                ...override,
                functions: config.override.functions,
            };
        }
        if (config.override.apis !== undefined) {
            override = {
                ...override,
                apis: config.override.apis,
            };
        }
    }

    return {
        refreshTokenPath: appInfo.apiBasePath.appendPath(new NormalisedURLPath(REFRESH_API_PATH)),
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
        errorHandlers,
        antiCsrf,
        signOutFeature,
        override,
    };
}

export function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none" {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
        });
    }
    return sameSite;
}

export function attachCreateOrRefreshSessionResponseToExpressRes(
    config: TypeNormalisedInput,
    res: express.Response,
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
