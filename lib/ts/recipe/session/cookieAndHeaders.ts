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
import type { BaseRequest, BaseResponse } from "../../framework";
import { logDebugMessage } from "../../logger";
import { UserContext } from "../../types";
import { encodeBase64 } from "../../utils";
import {
    availableTokenTransferMethods,
    authorizationHeaderKey,
    antiCsrfHeaderKey,
    frontTokenHeaderKey,
    authModeHeaderKey,
} from "./constants";
import SessionError from "./error";
import { TokenTransferMethod, TokenType, TypeNormalisedInput } from "./types";

export function clearSessionFromAllTokenTransferMethods(
    config: TypeNormalisedInput,
    res: BaseResponse,
    request: BaseRequest,
    userContext: UserContext
) {
    // We are clearing the session in all transfermethods to be sure to override cookies in case they have been already added to the response.
    // This is done to handle the following use-case:
    // If the app overrides signInPOST to check the ban status of the user after the original implementation and throwing an UNAUTHORISED error
    // In this case: the SDK has attached cookies to the response, but none was sent with the request
    // We can't know which to clear since we can't reliably query or remove the set-cookie header added to the response (causes issues in some frameworks, i.e.: hapi)
    // The safe solution in this case is to overwrite all the response cookies/headers with an empty value, which is what we are doing here
    for (const transferMethod of availableTokenTransferMethods) {
        clearSession(config, res, transferMethod, request, userContext);
    }
}

export function clearSession(
    config: TypeNormalisedInput,
    res: BaseResponse,
    transferMethod: TokenTransferMethod,
    request: BaseRequest,
    userContext: UserContext
) {
    // If we can be specific about which transferMethod we want to clear, there is no reason to clear the other ones
    const tokenTypes: TokenType[] = ["access", "refresh"];
    for (const token of tokenTypes) {
        setToken(config, res, token, "", 0, transferMethod, request, userContext);
    }

    res.removeHeader(antiCsrfHeaderKey);
    // This can be added multiple times in some cases, but that should be OK
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

export function buildFrontToken(userId: string, atExpiry: number, accessTokenPayload: any) {
    const tokenInfo = {
        uid: userId,
        ate: atExpiry,
        up: accessTokenPayload,
    };
    return encodeBase64(JSON.stringify(tokenInfo));
}

export function setFrontTokenInHeaders(res: BaseResponse, frontToken: string) {
    res.setHeader(frontTokenHeaderKey, frontToken, false);
    res.setHeader("Access-Control-Expose-Headers", frontTokenHeaderKey, true);
}

export function getCORSAllowedHeaders(): string[] {
    return [antiCsrfHeaderKey, HEADER_RID, authorizationHeaderKey, authModeHeaderKey];
}

export function getToken(
    config: TypeNormalisedInput,
    req: BaseRequest,
    tokenType: TokenType,
    transferMethod: TokenTransferMethod,
    userContext: UserContext
) {
    if (transferMethod === "cookie") {
        return req.getCookieValue(config.getCookieNameForTokenType(req, tokenType, userContext));
    } else if (transferMethod === "header") {
        const value = req.getHeaderValue(authorizationHeaderKey);
        if (value === undefined || !value.startsWith("Bearer ")) {
            return undefined;
        }

        return value.replace(/^Bearer /, "").trim();
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
    transferMethod: TokenTransferMethod,
    req: BaseRequest,
    userContext: UserContext
) {
    logDebugMessage(`setToken: Setting ${tokenType} token as ${transferMethod}`);
    if (transferMethod === "cookie") {
        setCookie(
            config,
            res,
            config.getCookieNameForTokenType(req, tokenType, userContext),
            value,
            expires,
            tokenType === "refresh" ? "refreshTokenPath" : "accessTokenPath",
            req,
            userContext
        );
    } else if (transferMethod === "header") {
        setHeader(res, config.getResponseHeaderNameForTokenType(req, tokenType, userContext), value);
    }
}

export function setHeader(res: BaseResponse, name: string, value: string) {
    res.setHeader(name, value, false);
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
    pathType: "refreshTokenPath" | "accessTokenPath",
    req: BaseRequest | undefined,
    userContext: UserContext
) {
    let domain = config.cookieDomain;
    let secure = config.cookieSecure;
    let sameSite = config.getCookieSameSite({
        request: req,
        userContext,
    });
    let path = "";
    if (pathType === "refreshTokenPath") {
        path = config.refreshTokenPath.getAsStringDangerous();
    } else if (pathType === "accessTokenPath") {
        path =
            config.accessTokenPath.getAsStringDangerous() === "" ? "/" : config.accessTokenPath.getAsStringDangerous();
    }
    let httpOnly = true;

    return res.setCookie(name, value, domain, secure, httpOnly, expires, path, sameSite);
}

export function getAuthModeFromHeader(req: BaseRequest): string | undefined {
    return req.getHeaderValue(authModeHeaderKey)?.toLowerCase();
}

/**
 *  This function addresses an edge case where changing the cookieDomain config on the server can
 *  lead to session integrity issues. For instance, if the API server URL is 'api.example.com'
 *  with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com',
 *  the client may retain cookies with both '.example.com' and 'api.example.com' domains.
 *
 *  Consequently, if the server chooses the older cookie, session invalidation occurs, potentially
 *  resulting in an infinite refresh loop. To fix this, users are asked to specify "olderCookieDomain" in
 *  the config.
 *
 * This function checks for multiple cookies with the same name and clears the cookies for the older domain
 */
export function clearSessionCookiesFromOlderCookieDomain({
    req,
    res,
    config,
    userContext,
}: {
    req: BaseRequest;
    res: BaseResponse;
    config: TypeNormalisedInput;
    userContext: UserContext;
}): void {
    const allowedTransferMethod = config.getTokenTransferMethod({
        req,
        forCreateNewSession: false,
        userContext,
    });

    // If the transfer method is 'header', there's no need to clear cookies immediately, even if there are multiple in the request.
    if (allowedTransferMethod === "header") {
        return;
    }

    let didClearCookies = false;

    const tokenTypes: TokenType[] = ["access", "refresh"];
    for (const token of tokenTypes) {
        if (hasMultipleCookiesForTokenType(config, req, token, userContext)) {
            // If a request has multiple session cookies and 'olderCookieDomain' is
            // unset, we can't identify the correct cookie for refreshing the session.
            // Using the wrong cookie can cause an infinite refresh loop. To avoid this,
            // we throw a 500 error asking the user to set 'olderCookieDomain'.
            if (config.olderCookieDomain === undefined) {
                throw new Error(
                    `The request contains multiple session cookies. This may happen if you've changed the 'cookieDomain' value in your configuration. To clear tokens from the previous domain, set 'olderCookieDomain' in your config.`
                );
            }

            logDebugMessage(
                `clearSessionCookiesFromOlderCookieDomain: Clearing duplicate ${token} cookie with domain ${config.olderCookieDomain}`
            );
            setToken(
                { ...config, cookieDomain: config.olderCookieDomain },
                res,
                token,
                "",
                0,
                "cookie",
                req,
                userContext
            );
            didClearCookies = true;
        }
    }

    if (didClearCookies) {
        throw new SessionError({
            message:
                "The request contains multiple session cookies. We are clearing the cookie from olderCookieDomain. Session will be refreshed in the next refresh call.",
            type: SessionError.CLEAR_DUPLICATE_SESSION_COOKIES,
        });
    }
}

export function hasMultipleCookiesForTokenType(
    config: TypeNormalisedInput,
    req: BaseRequest,
    tokenType: TokenType,
    userContext: UserContext
): boolean {
    const cookieString = req.getHeaderValue("cookie");

    if (cookieString === undefined) {
        return false;
    }

    const cookies = parseCookieStringFromRequestHeaderAllowingDuplicates(cookieString);
    const cookieName = config.getCookieNameForTokenType(req, tokenType, userContext);
    return cookies[cookieName] !== undefined && cookies[cookieName].length > 1;
}

// This function is required because cookies library (and most of the popular libraries in npm)
// does not support parsing multiple cookies with the same name.
function parseCookieStringFromRequestHeaderAllowingDuplicates(cookieString: string): Record<string, string[]> {
    const cookies: Record<string, string[]> = {};

    const cookiePairs = cookieString.split(";");

    for (const cookiePair of cookiePairs) {
        const [name, value] = cookiePair.trim().split("=");

        // Try to decode the name or fallback to the original name
        let decodedName = name;
        try {
            decodedName = decodeURIComponent(name);
        } catch (e) {
            logDebugMessage(
                `parseCookieStringFromRequestHeaderAllowingDuplicates: Error decoding cookie name: ${name}`
            );
        }

        cookies.hasOwnProperty(decodedName) ? cookies[decodedName].push(value) : (cookies[decodedName] = [value]);
    }

    return cookies;
}
