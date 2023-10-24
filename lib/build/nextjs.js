"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppDirRequestHandler = exports.superTokensNextWrapper = void 0;
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
}
exports.default = NextJS;
exports.superTokensNextWrapper = NextJS.superTokensNextWrapper;
exports.getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
