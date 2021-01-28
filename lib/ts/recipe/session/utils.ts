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
import { maxVersion } from "../../utils";

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

    function isAnIpAddress(ipaddress: string) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            ipaddress
        );
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

export function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    let cookieDomain =
        config === undefined || config.cookieDomain === undefined
            ? undefined
            : normaliseSessionScopeOrThrowError(recipeInstance.getRecipeId(), config.cookieDomain);

    let cookieSameSite =
        config === undefined || config.cookieSameSite === undefined
            ? "lax"
            : normaliseSameSiteOrThrowError(recipeInstance.getRecipeId(), config.cookieSameSite);

    let cookieSecure = config === undefined || config.cookieSecure === undefined ? false : config.cookieSecure;

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

    let enableAntiCsrf = config === undefined || config.enableAntiCsrf === undefined ? false : config.enableAntiCsrf;

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

export async function getEnableAntiCsrfBoolean(recipeInstance: SessionRecipe): Promise<boolean> {
    let handShakeInfo = await recipeInstance.getHandshakeInfo();
    let cdiVersion = await recipeInstance.getQuerier().getAPIVersion();
    if (maxVersion(cdiVersion, "2.6") === cdiVersion) {
        return recipeInstance.config.enableAntiCsrf;
    }
    return handShakeInfo.enableAntiCsrf;
}
