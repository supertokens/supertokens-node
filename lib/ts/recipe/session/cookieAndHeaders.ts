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
import { BaseRequest, BaseResponse } from "../../framework";
import { TypeNormalisedInput } from "./types";

const accessTokenCookieKey = "sAccessToken";
const refreshTokenCookieKey = "sRefreshToken";

// there are two of them because one is used by the server to check if the user is logged in and the other is checked by the frontend to see if the user is logged in.
const idRefreshTokenCookieKey = "sIdRefreshToken";
const idRefreshTokenHeaderKey = "id-refresh-token";

const antiCsrfHeaderKey = "anti-csrf";

const ridHeaderKey = "rid";

const frontTokenHeaderKey = "front-token";
const missingClaimIdHeaderKey = "missing-claim-id";

/**
 * @description clears all the auth cookies from the response
 */
export function clearSessionFromCookie(config: TypeNormalisedInput, res: BaseResponse) {
    setCookie(config, res, accessTokenCookieKey, "", 0, "accessTokenPath");
    setCookie(config, res, refreshTokenCookieKey, "", 0, "refreshTokenPath");
    setCookie(config, res, idRefreshTokenCookieKey, "", 0, "accessTokenPath");
    res.setHeader(idRefreshTokenHeaderKey, "remove", false);
    res.setHeader("Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachAccessTokenToCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    token: string,
    expiry: number
) {
    setCookie(config, res, accessTokenCookieKey, token, expiry, "accessTokenPath");
}

/**
 * @param expiry: must be time in milliseconds from epoch time.
 */
export function attachRefreshTokenToCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    token: string,
    expiry: number
) {
    setCookie(config, res, refreshTokenCookieKey, token, expiry, "refreshTokenPath");
}

export function setMissingClaimIdHeader(response: BaseResponse, claimId: string) {
    response.setHeader(missingClaimIdHeaderKey, claimId, false);
    response.setHeader("Access-Control-Expose-Headers", missingClaimIdHeaderKey, true);
}

export function getAccessTokenFromCookie(req: BaseRequest): string | undefined {
    return req.getCookieValue(accessTokenCookieKey);
}

export function getRefreshTokenFromCookie(req: BaseRequest): string | undefined {
    return req.getCookieValue(refreshTokenCookieKey);
}

export function getAntiCsrfTokenFromHeaders(req: BaseRequest): string | undefined {
    return req.getHeaderValue(antiCsrfHeaderKey);
}

export function getRidFromHeader(req: BaseRequest): string | undefined {
    return req.getHeaderValue(ridHeaderKey);
}

export function getIdRefreshTokenFromCookie(req: BaseRequest): string | undefined {
    return req.getCookieValue(idRefreshTokenCookieKey);
}

export function setAntiCsrfTokenInHeaders(res: BaseResponse, antiCsrfToken: string) {
    res.setHeader(antiCsrfHeaderKey, antiCsrfToken, false);
    res.setHeader("Access-Control-Expose-Headers", antiCsrfHeaderKey, true);
}

export function setIdRefreshTokenInHeaderAndCookie(
    config: TypeNormalisedInput,
    res: BaseResponse,
    idRefreshToken: string,
    expiry: number
) {
    res.setHeader(idRefreshTokenHeaderKey, idRefreshToken + ";" + expiry, false);
    res.setHeader("Access-Control-Expose-Headers", idRefreshTokenHeaderKey, true);

    setCookie(config, res, idRefreshTokenCookieKey, idRefreshToken, expiry, "accessTokenPath");
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
    return [antiCsrfHeaderKey, ridHeaderKey];
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
