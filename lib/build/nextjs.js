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
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPreParsedRequestResponse =
    exports.withSession =
    exports.getSSRSession =
    exports.getAppDirRequestHandler =
    exports.superTokensNextWrapper =
        void 0;
const express_1 = require("./framework/express");
const customFramework_1 = require("./customFramework");
function next(request, response, resolve, reject) {
    return async function (middlewareError) {
        if (middlewareError === undefined) {
            return resolve();
        }
        await (0, express_1.errorHandler)()(middlewareError, request, response, (errorHandlerError) => {
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
                await (0, express_1.errorHandler)()(err, request, response, (errorHandlerError) => {
                    if (errorHandlerError !== undefined) {
                        return reject(errorHandlerError);
                    }
                    // do nothing, error handler does not resolve the promise.
                });
            }
        });
    }
    static getAppDirRequestHandler() {
        return (0, customFramework_1.handleAuthAPIRequest)();
    }
    static async getSSRSession(cookies) {
        var _a;
        let accessToken =
            (_a = cookies.find((cookie) => cookie.name === "sAccessToken")) === null || _a === void 0
                ? void 0
                : _a.value;
        return await (0, customFramework_1.getSessionForSSRUsingAccessToken)(accessToken);
    }
    static async withSession(req, handler, options, userContext) {
        return await (0, customFramework_1.withSession)(req, handler, options, userContext);
    }
    static async withPreParsedRequestResponse(req, handler) {
        return (0, customFramework_1.withPreParsedRequestResponse)(req, handler);
    }
}
exports.default = NextJS;
exports.superTokensNextWrapper = NextJS.superTokensNextWrapper;
exports.getAppDirRequestHandler = NextJS.getAppDirRequestHandler;
exports.getSSRSession = NextJS.getSSRSession;
exports.withSession = NextJS.withSession;
exports.withPreParsedRequestResponse = NextJS.withPreParsedRequestResponse;
