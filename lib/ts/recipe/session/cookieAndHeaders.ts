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
import { HEADER_RID } from "../../constants";
import { BaseRequest, BaseResponse } from "../../framework";
import { TokenTransferMethod, TokenType, TypeNormalisedInput } from "./types";

const authorizationHeaderKey = "authorization";
const accessTokenCookieKey = "sAccessToken";
const accessTokenHeaderKey = "st-access-token";
const refreshTokenCookieKey = "sRefreshToken";
const refreshTokenHeaderKey = "st-refresh-token";

const antiCsrfHeaderKey = "anti-csrf";

const frontTokenHeaderKey = "front-token";

const authModeHeaderKey = "st-auth-mode";

export const availableTokenTransferMethods: TokenTransferMethod[] = ["cookie", "header"];

/**
 * @description clears all the auth cookies from the response
 */
export function clearSession(
    config: TypeNormalisedInput,
    req: BaseRequest,
    res: BaseResponse,
    userContext: any,
    transferMethod?: TokenTransferMethod | "missing_auth_header"
) {
    // If we can tell it's a cookie based session we are not clearing using headers
    let outputTransferMethod = transferMethod || config.getTokenTransferMethod({ req, userContext });

    if (outputTransferMethod === "missing_auth_header") {
        outputTransferMethod = "header";
    }

    const tokenTypes: TokenType[] = ["access", "refresh"];
    for (const token of tokenTypes) {
        setToken(config, res, token, "", 0, outputTransferMethod);

        // This is to ensure we clear the cookies as well if the user has migrated to headers,
        // because this can't be done on the client side
        if (outputTransferMethod === "header" && isTokenInCookies(req, token)) {
            setToken(config, res, token, "", 0, "cookie");
        }
    }
    res.setHeader(frontTokenHeaderKey, "remove", false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}

export function getAntiCsrfTokenFromHeaders(req: BaseRequest): string | undefined {
    return req.getHeaderValue(antiCsrfHeaderKey);
}

export function setAntiCsrfTokenInHeaders(res: BaseResponse, antiCsrfToken: string) {
    res.setHeader(antiCsrfHeaderKey, antiCsrfToken, false);
    res.setHeader("Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}

export function setFrontTokenInHeaders(res: BaseResponse, userId: string, atExpiry: number, accessTokenPayload: any) {
    const tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    res.setHeader(frontTokenHeaderKey, Buffer.from(JSON.stringify(tokenInfo)).toString("base64"), false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}

export function getCORSAllowedHeaders(): string[] {
    return [antiCsrfHeaderKey, HEADER_RID, authorizationHeaderKey, refreshTokenHeaderKey, authModeHeaderKey];
}

function getCookieNameFromTokenType(tokenType: TokenType) {
    switch (tokenType) {
        case "access":
            return accessTokenCookieKey;
        case "refresh":
            return refreshTokenCookieKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}

function getResponseHeaderNameForTokenType(tokenType: TokenType) {
    switch (tokenType) {
        case "access":
            // We are getting the access token from the authorization header during verification.
            // This case is handled in the getToken fn below.
            return accessTokenHeaderKey;
        case "refresh":
            return refreshTokenHeaderKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}

export function isTokenInCookies(req: BaseRequest, tokenType: TokenType) {
    return req.getCookieValue(getCookieNameFromTokenType(tokenType)) !== undefined;
}

export function getToken(req: BaseRequest, tokenType: TokenType, transferMethod: TokenTransferMethod) {
    if (transferMethod === "cookie") {
        return req.getCookieValue(getCookieNameFromTokenType(tokenType));
    } else if (transferMethod === "header") {
        const value = req.getHeaderValue(authorizationHeaderKey);
        if (value === undefined || !value.startsWith("Bearer ")) {
            return undefined;
        }

        return value.replace(/^Bearer /, "");
    } else {
        throw new Error("Should never happen: Unknown transferMethod: " + transferMethod);
    }
}

export function setToken(
    config: TypeNormalisedInput,
    res: BaseResponse,
    tokenType: TokenType,
    value: string,
    expires: number,
    transferMethod: TokenTransferMethod
) {
    if (transferMethod === "cookie") {
        setCookie(
            config,
            res,
            getCookieNameFromTokenType(tokenType),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath"
        );
    } else if (transferMethod === "header") {
        setHeader(res, getResponseHeaderNameForTokenType(tokenType), value, expires);
    }
}

export function setHeader(res: BaseResponse, name: string, value: string, expires: number) {
    if (value === "remove") {
        res.setHeader(name, value, false);
    } else {
        res.setHeader(name, `${value};${expires}`, false);
    }
    res.setHeader("Access-Control-Expose-Headers", name, true);
}

/**
 *
 * @param res
 * @param name
 * @param value
 * @param domain
 * @param secure
 * @param httpOnly
 * @param expires
 * @param path
 */
export function setCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    name: string,
    value: string,
    expires: number,
    pathType: "refreshTokenPath" | "accessTokenPath"
) {
    let domain = config.cookieDomain;
    let secure = config.cookieSecure;
    let sameSite = config.cookieSameSite;
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = config.refreshTokenPath.getAsStringDangerous();
    } else if (pathType === "accessTokenPath") {
        path = "/";
    }
    let httpOnly = true;

    return res.setCookie(name, value, domain, secure, httpOnly, expires, path, sameSite);
}

export function getAuthModeFromHeader(req: BaseRequest): string | undefined {
    return req.getHeaderValue(authModeHeaderKey);
}
