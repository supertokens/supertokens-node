"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPreParsedRequestResponse = exports.withSession = exports.getSSRSession = exports.getAppDirRequestHandler = exports.superTokensNextWrapper = void 0;
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
const cookie_1 = require("cookie");
const express_1 = require("./framework/express");
const custom_1 = require("./framework/custom");
const session_1 = __importDefault(require("./recipe/session"));
const recipe_1 = __importDefault(require("./recipe/session/recipe"));
const cookieAndHeaders_1 = require("./recipe/session/cookieAndHeaders");
const constants_1 = require("./recipe/session/constants");
const jwt_1 = require("./recipe/session/jwt");
function next(request, response, resolve, reject) {
    return async function (middlewareError) {
        if (middlewareError === undefined) {
            return resolve();
        }
        await express_1.errorHandler()(middlewareError, request, response, (errorHandlerError) => {
            if (errorHandlerError !== undefined) {
                return reject(errorHandlerError);
            }
            // do nothing, error handler does not resolve the promise.
        });
    };
}
class NextJS {
    static async superTokensNextWrapper(middleware, request, response) {
        return new Promise(async (resolve, reject) => {
            try {
                let callbackCalled = false;
                const result = await middleware((err) => {
                    callbackCalled = true;
                    next(request, response, resolve, reject)(err);
                });
                if (!callbackCalled && !response.finished && !response.headersSent) {
                    return resolve(result);
                }
            } catch (err) {
                await express_1.errorHandler()(err, request, response, (errorHandlerError) => {
                    if (errorHandlerError !== undefined) {
                        return reject(errorHandlerError);
                    }
                    // do nothing, error handler does not resolve the promise.
                });
            }
        });
    }
    static getAppDirRequestHandler(NextResponse) {
        const stMiddleware = custom_1.middleware((req) => {
            const query = Object.fromEntries(new URL(req.url).searchParams.entries());
            const cookies = Object.fromEntries(req.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
            return new custom_1.PreParsedRequest({
                method: req.method,
                url: req.url,
                query: query,
                headers: req.headers,
                cookies,
                getFormBody: () => req.formData(),
                getJSONBody: () => req.json(),
            });
        });
        return async function handleCall(req) {
            const baseResponse = new custom_1.CollectingResponse();
            const { handled, error } = await stMiddleware(req, baseResponse);
            if (error) {
                throw error;
            }
            if (!handled) {
                return new NextResponse("Not found", { status: 404 });
            }
            for (const respCookie of baseResponse.cookies) {
                baseResponse.headers.append(
                    "Set-Cookie",
                    cookie_1.serialize(respCookie.key, respCookie.value, {
                        domain: respCookie.domain,
                        expires: new Date(respCookie.expires),
                        httpOnly: respCookie.httpOnly,
                        path: respCookie.path,
                        sameSite: respCookie.sameSite,
                        secure: respCookie.secure,
                    })
                );
            }
            return new NextResponse(baseResponse.body, {
                headers: baseResponse.headers,
                status: baseResponse.statusCode,
            });
        };
    }
    static async commonSSRSession(baseRequest, options, userContext) {
        let baseResponse = new custom_1.CollectingResponse();
        const recipe = recipe_1.default.getInstanceOrThrowError();
        const tokenTransferMethod = recipe.config.getTokenTransferMethod({
            req: baseRequest,
            forCreateNewSession: false,
            userContext,
        });
        const transferMethods =
            tokenTransferMethod === "any" ? constants_1.availableTokenTransferMethods : [tokenTransferMethod];
        const hasToken = transferMethods.some((transferMethod) => {
            const token = cookieAndHeaders_1.getToken(baseRequest, "access", transferMethod);
            if (!token) {
                return false;
            }
            try {
                jwt_1.parseJWTWithoutSignatureVerification(token);
                return true;
            } catch (_a) {
                return false;
            }
        });
        try {
            let session = await session_1.default.getSession(baseRequest, baseResponse, options, userContext);
            return {
                session,
                hasInvalidClaims: false,
                hasToken,
                baseResponse,
            };
        } catch (err) {
            if (session_1.default.Error.isErrorFromSuperTokens(err)) {
                return {
                    hasToken,
                    hasInvalidClaims: err.type === session_1.default.Error.INVALID_CLAIMS,
                    session: undefined,
                    baseResponse,
                    nextResponse: new Response("Authentication required", {
                        status: err.type === session_1.default.Error.INVALID_CLAIMS ? 403 : 401,
                    }),
                };
            } else {
                throw err;
            }
        }
    }
    static async getSSRSession(cookies, headers, options, userContext) {
        let cookiesObj = Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
        let baseRequest = new custom_1.PreParsedRequest({
            method: "get",
            url: "",
            query: {},
            headers: headers,
            cookies: cookiesObj,
            getFormBody: async () => [],
            getJSONBody: async () => [],
        });
        const _a = await NextJS.commonSSRSession(baseRequest, options, userContext),
            { baseResponse, nextResponse } = _a,
            result = __rest(_a, ["baseResponse", "nextResponse"]);
        return result;
    }
    static async withSession(req, handler, options, userContext) {
        try {
            const query = Object.fromEntries(new URL(req.url).searchParams.entries());
            const cookies = Object.fromEntries(req.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
            let baseRequest = new custom_1.PreParsedRequest({
                method: req.method,
                url: req.url,
                query: query,
                headers: req.headers,
                cookies: cookies,
                getFormBody: () => req.formData(),
                getJSONBody: () => req.json(),
            });
            const { session, nextResponse, baseResponse } = await NextJS.commonSSRSession(
                baseRequest,
                options,
                userContext
            );
            if (nextResponse) {
                return nextResponse;
            }
            let userResponse;
            try {
                userResponse = await handler(undefined, session);
            } catch (err) {
                await custom_1.errorHandler()(err, baseRequest, baseResponse, (errorHandlerError) => {
                    if (errorHandlerError) {
                        throw errorHandlerError;
                    }
                });
                // The headers in the userResponse are set twice from baseResponse, but the resulting response contains unique headers.
                userResponse = new Response(baseResponse.body, {
                    status: baseResponse.statusCode,
                    headers: baseResponse.headers,
                });
            }
            let didAddCookies = false;
            let didAddHeaders = false;
            for (const respCookie of baseResponse.cookies) {
                didAddCookies = true;
                userResponse.headers.append(
                    "Set-Cookie",
                    cookie_1.serialize(respCookie.key, respCookie.value, {
                        domain: respCookie.domain,
                        expires: new Date(respCookie.expires),
                        httpOnly: respCookie.httpOnly,
                        path: respCookie.path,
                        sameSite: respCookie.sameSite,
                        secure: respCookie.secure,
                    })
                );
            }
            baseResponse.headers.forEach((value, key) => {
                didAddHeaders = true;
                userResponse.headers.set(key, value);
            });
            /**
             * For some deployment services (Vercel for example) production builds can return cached results for
             * APIs with older header values. In this case if the session tokens have changed (because of refreshing
             * for example) the cached result would still contain the older tokens and sessions would stop working.
             *
             * As a result, if we add cookies or headers from base response we also set the Cache-Control header
             * to make sure that the final result is not a cached version.
             */
            if (didAddCookies || didAddHeaders) {
                if (!userResponse.headers.has("Cache-Control")) {
                    // This is needed for production deployments with Vercel
                    userResponse.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
                }
            }
            return userResponse;
        } catch (error) {
            return await handler(error, undefined);
        }
    }
    static async withPreParsedRequestResponse(req, handler) {
        const query = Object.fromEntries(new URL(req.url).searchParams.entries());
        const cookies = Object.fromEntries(req.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
        let baseRequest = new custom_1.PreParsedRequest({
            method: req.method,
            url: req.url,
            query: query,
            headers: req.headers,
            cookies: cookies,
            getFormBody: () => req.formData(),
            getJSONBody: () => req.json(),
        });
        let baseResponse = new custom_1.CollectingResponse();
        let userResponse;
        try {
            userResponse = await handler(baseRequest, baseResponse);
        } catch (err) {
            await custom_1.errorHandler()(err, baseRequest, baseResponse, (errorHandlerError) => {
                if (errorHandlerError) {
                    throw errorHandlerError;
                }
            });
            // The headers in the userResponse are set twice from baseResponse, but the resulting response contains unique headers.
            userResponse = new Response(baseResponse.body, {
                status: baseResponse.statusCode,
                headers: baseResponse.headers,
            });
        }
        let didAddCookies = false;
        let didAddHeaders = false;
        for (const respCookie of baseResponse.cookies) {
            didAddCookies = true;
            userResponse.headers.append(
                "Set-Cookie",
                cookie_1.serialize(respCookie.key, respCookie.value, {
                    domain: respCookie.domain,
                    expires: new Date(respCookie.expires),
                    httpOnly: respCookie.httpOnly,
                    path: respCookie.path,
                    sameSite: respCookie.sameSite,
                    secure: respCookie.secure,
                })
            );
        }
        baseResponse.headers.forEach((value, key) => {
            didAddHeaders = true;
            userResponse.headers.set(key, value);
        });
        /**
         * For some deployment services (Vercel for example) production builds can return cached results for
         * APIs with older header values. In this case if the session tokens have changed (because of refreshing
         * for example) the cached result would still contain the older tokens and sessions would stop working.
         *
         * As a result, if we add cookies or headers from base response we also set the Cache-Control header
         * to make sure that the final result is not a cached version.
         */
        if (didAddCookies || didAddHeaders) {
            if (!userResponse.headers.has("Cache-Control")) {
                // This is needed for production deployments with Vercel
                userResponse.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            }
        }
        return userResponse;
    }
}
exports.default = NextJS;
exports.superTokensNextWrapper = NextJS.superTokensNextWrapper;
exports.getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
exports.getSSRSession = NextJS.getSSRSession;
exports.withSession = NextJS.withSession;
exports.withPreParsedRequestResponse = NextJS.withPreParsedRequestResponse;
