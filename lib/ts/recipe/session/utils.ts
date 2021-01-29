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

import { CreateOrRefreshAPIResponse, TypeInput, TypeNormalisedInput, NormalisedErrorHandlers } from "./types";
import {
    setFrontTokenInHeaders,
    attachAccessTokenToCookie,
    attachRefreshTokenToCookie,
    setIdRefreshTokenInHeaderAndCookie,
    setAntiCsrfTokenInHeaders,
} from "./cookieAndHeaders";
import * as express from "express";
import { URL } from "url";
import SessionRecipe from "./sessionRecipe";
import STError from "./error";
import { sendTryRefreshTokenResponse, sendTokenTheftDetectedResponse, sendUnauthorisedResponse } from "./middleware";
import { REFRESH_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { NormalisedAppinfo } from "../../types";
import * as psl from "psl";
import { isAnIpAddress } from "../../utils";

export function normaliseSessionScopeOrThrowError(rId: string, sessionScope: string): string {
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
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("Please provide a valid sessionScope"),
                },
                rId
            );
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

export function getTopLevelDomain(url: string, recipeInstance: SessionRecipe): string {
    let urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || isAnIpAddress(hostname)) {
        return hostname;
    }
    let parsedURL = psl.parse(hostname) as psl.ParsedDomain;
    if (parsedURL.domain === null) {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Please make sure that the apiDomain and websiteDomain have correct values"),
            },
            recipeInstance.getRecipeId()
        );
    }
    return parsedURL.domain;
}

export function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(recipeInstance.getRecipeId(), config.cookieDomain);

    let topLevelAPIDomain = getTopLevelDomain(appInfo.apiDomain.getAsStringDangerous(), recipeInstance);
    let topLevelWebsiteDomain = getTopLevelDomain(appInfo.websiteDomain.getAsStringDangerous(), recipeInstance);

    let cookieSameSite: "strict" | "lax" | "none" = topLevelAPIDomain !== topLevelWebsiteDomain ? "none" : "lax";
    cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? cookieSameSite
            : normaliseSameSiteOrThrowError(recipeInstance.getRecipeId(), config.cookieSameSite);

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

    let enableAntiCsrf =
        config === undefined || config.enableAntiCsrf === undefined ? cookieSameSite === "none" : config.enableAntiCsrf;

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

    if (cookieSameSite === "none" && !enableAntiCsrf) {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error(
                    'Security error: enableAntiCsrf can\'t be set to false if cookieSameSite value is "none".'
                ),
            },
            recipeInstance.getRecipeId()
        );
    }

    return {
        refreshTokenPath: appInfo.apiBasePath.appendPath(
            recipeInstance.getRecipeId(),
            new NormalisedURLPath(recipeInstance.getRecipeId(), REFRESH_API_PATH)
        ),
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
        errorHandlers,
        enableAntiCsrf,
    };
}

export function normaliseSameSiteOrThrowError(rId: string, sameSite: string): "strict" | "lax" | "none" {
    sameSite = sameSite.trim();
    sameSite = sameSite.toLocaleLowerCase();
    if (sameSite !== "strict" && sameSite !== "lax" && sameSite !== "none") {
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error('cookie same site must be one of "strict", "lax", or "none"'),
            },
            rId
        );
    }
    return sameSite;
}

export function attachCreateOrRefreshSessionResponseToExpressRes(
    recipeInstance: SessionRecipe,
    res: express.Response,
    response: CreateOrRefreshAPIResponse
) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    setFrontTokenInHeaders(
        recipeInstance,
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    attachAccessTokenToCookie(recipeInstance, res, accessToken.token, accessToken.expiry);
    attachRefreshTokenToCookie(recipeInstance, res, refreshToken.token, refreshToken.expiry);
    setIdRefreshTokenInHeaderAndCookie(recipeInstance, res, idRefreshToken.token, idRefreshToken.expiry);
    if (response.antiCsrfToken !== undefined) {
        setAntiCsrfTokenInHeaders(recipeInstance, res, response.antiCsrfToken);
    }
}
