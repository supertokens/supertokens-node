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
import { normaliseURLPathOrThrowError } from "../../utils";
import SessionRecipe from "./sessionRecipe";
import STError from "./error";
import { sendTryRefreshTokenResponse, sendTokenTheftDetectedResponse, sendUnauthorisedResponse } from "./middleware";

export function normaliseSessionScopeOrThrowError(rId: string, sessionScope: string): string {
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

        // add a leading dot
        if (!sessionScope.startsWith(".")) {
            sessionScope = "." + sessionScope;
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

export function validateAndNormaliseUserInput(recipeInstance: SessionRecipe, config?: TypeInput): TypeNormalisedInput {
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
        if (config.errorHandlers.onTryRefreshToken !== undefined) {
            errorHandlers.onTryRefreshToken = config.errorHandlers.onTryRefreshToken;
        }
        if (config.errorHandlers.onUnauthorised !== undefined) {
            errorHandlers.onUnauthorised = config.errorHandlers.onUnauthorised;
        }
    }

    return {
        accessTokenPath: "/",
        cookieDomain,
        cookieSameSite,
        cookieSecure,
        sessionExpiredStatusCode,
        sessionRefreshFeature,
        errorHandlers,
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
