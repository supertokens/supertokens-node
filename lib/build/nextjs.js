"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPreParsedRequestResponse = exports.withSession = exports.getSSRSession = exports.getAppDirRequestHandler = exports.superTokensNextWrapper = void 0;
const cookie_1 = require("cookie");
const express_1 = require("./framework/express");
const utils_1 = require("./utils");
const custom_1 = require("./framework/custom");
const customFramework_1 = require("./customFramework");
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
    static getCookieExtractor() {
        return (req) => Object.fromEntries(req.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
    }
    static getAppDirRequestHandler(NextResponse) {
        const getCookieFromNextReq = this.getCookieExtractor();
        const stMiddleware = custom_1.middleware((req) => {
            return customFramework_1.createPreParsedRequest(req, getCookieFromNextReq);
        });
        return customFramework_1.getHandleCall(NextResponse, stMiddleware);
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
        const _a = await customFramework_1.getSessionDetails(baseRequest, options, utils_1.getUserContext(userContext)),
            { baseResponse, response } = _a,
            result = __rest(_a, ["baseResponse", "response"]);
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
            const { session, response, baseResponse } = await customFramework_1.getSessionDetails(
                baseRequest,
                options,
                utils_1.getUserContext(userContext)
            );
            if (response) {
                return response;
            }
            let userResponse;
            try {
                userResponse = await handler(undefined, session);
            } catch (err) {
                userResponse = await customFramework_1.handleError(err, baseRequest, baseResponse);
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
        const getCookieFromNextReq = this.getCookieExtractor();
        let baseRequest = customFramework_1.createPreParsedRequest(req, getCookieFromNextReq);
        let baseResponse = new custom_1.CollectingResponse();
        let userResponse;
        try {
            userResponse = await handler(baseRequest, baseResponse);
        } catch (err) {
            userResponse = await customFramework_1.handleError(err, baseRequest, baseResponse);
        }
        return customFramework_1.addCookies(baseResponse, userResponse);
    }
}
exports.default = NextJS;
exports.superTokensNextWrapper = NextJS.superTokensNextWrapper;
exports.getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
exports.getSSRSession = NextJS.getSSRSession;
exports.withSession = NextJS.withSession;
exports.withPreParsedRequestResponse = NextJS.withPreParsedRequestResponse;
