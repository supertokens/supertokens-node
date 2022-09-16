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
import { TokenType, TypeNormalisedInput } from "./types";

const authorizationHeaderKey = "authorization";
const accessTokenCookieKey = "sAccessToken";
const accessTokenheaderKey = "st-access-token";
const refreshTokenCookieKey = "sRefreshToken";
const refreshTokenHeaderKey = "st-refresh-token";

// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "st-id-refresh-token";

const antiCsrfHeaderKey = "anti-csrf";

const frontTokenHeaderKey = "front-token";

/**
 * @description clears all the auth cookies from the response
 */
export function clearSession(config: TypeNormalisedInput, req: BaseRequest, res: BaseResponse, userContext: any) {
    const transferMethod = config.getTokenTransferMethod({ req, userContext });

    const tokenTypes: TokenType[] = ["access", "refresh", "idRefresh"];
    for (const token of tokenTypes) {
        setToken(config, req, res, token, "", 0, userContext, transferMethod);
        if (transferMethod === "header" && hasTokenCookie(req, token)) {
            setToken(config, req, res, token, "", 0, userContext, "cookie");
        }
    }
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
    return [antiCsrfHeaderKey, HEADER_RID, authorizationHeaderKey, refreshTokenHeaderKey, idRefreshTokenHeaderKey];
}

function getCookieNameFromTokenType(tokenType: TokenType) {
    switch (tokenType) {
        case "access":
            return accessTokenCookieKey;
        case "idRefresh":
            return idRefreshTokenCookieKey;
        case "refresh":
            return refreshTokenCookieKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}

function getHeaderNameFromTokenType(tokenType: TokenType) {
    switch (tokenType) {
        case "access":
            return accessTokenheaderKey;
        case "idRefresh":
            return idRefreshTokenHeaderKey;
        case "refresh":
            return refreshTokenHeaderKey;
        default:
            throw new Error("Unknown token type, should never happen.");
    }
}

export function hasTokenCookie(req: BaseRequest, tokenType: TokenType) {
    return req.getCookieValue(getCookieNameFromTokenType(tokenType)) !== undefined;
}

export function getToken(
    config: TypeNormalisedInput,
    req: BaseRequest,
    tokenType: TokenType,
    userContext: any,
    transferMethod?: "cookie" | "header"
) {
    if (transferMethod === undefined) {
        transferMethod = config.getTokenTransferMethod({ req, userContext });
    }

    if (transferMethod === "cookie") {
        return req.getCookieValue(getCookieNameFromTokenType(tokenType));
    } else if (transferMethod === "header") {
        if (tokenType === "access") {
            const value = req.getHeaderValue(authorizationHeaderKey);
            if (value === undefined || !value.startsWith("Bearer ")) {
                return undefined;
            }
            return value.replace(/^Bearer /, "");
        }
        return req.getHeaderValue(getHeaderNameFromTokenType(tokenType));
    } else {
        throw new Error("Should never happen: Unknown transferMethod: " + transferMethod);
    }
}

export function setToken(
    config: TypeNormalisedInput,
    req: BaseRequest,
    res: BaseResponse,
    tokenType: TokenType,
    value: string,
    expires: number,
    userContext: any,
    transferMethod?: "cookie" | "header"
) {
    if (transferMethod === undefined) {
        transferMethod = config.getTokenTransferMethod({ req, userContext });
    }

    if (transferMethod === "cookie") {
        // We intentionally use accessTokenPath for idRefresh tokens
        setCookie(
            config,
            res,
            getCookieNameFromTokenType(tokenType),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath"
        );

        // If we are saving the idRefresh token we want to also add it as a
        if (tokenType === "idRefresh") {
            setHeader(res, idRefreshTokenHeaderKey, value === "" ? "remove" : value, expires);
        }
    } else if (transferMethod === "header") {
        if (tokenType === "idRefresh" && value === "") {
            setHeader(res, getHeaderNameFromTokenType(tokenType), "remove", expires);
        } else {
            setHeader(res, getHeaderNameFromTokenType(tokenType), value, expires);
        }
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
