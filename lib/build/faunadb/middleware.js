"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("./express");
const cookieAndHeaders_1 = require("../cookieAndHeaders");
const handshakeInfo_1 = require("../handshakeInfo");
const OriginalMiddleware = require("../middleware");
/* TODO: is there a way to not have to duplicate all the code here from ../middleware?
 * Simply calling that will not work since we want to call getSession and refreshSession of
 * faunaDB.
 */
// We do not use the middleware functions from ../middleware, because we want the
// refreshSession, getSession of the ones defined for faunadb to be called.
function autoRefreshMiddleware() {
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                let path = request.originalUrl.split("?")[0];
                let refreshTokenPath = yield getRefreshPath();
                if (
                    (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                    request.method.toLowerCase() === "post"
                ) {
                    yield express_1.refreshSession(request, response);
                    return response.send(JSON.stringify({}));
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.autoRefreshMiddleware = autoRefreshMiddleware;
function getRefreshPath() {
    return __awaiter(this, void 0, void 0, function* () {
        let refreshTokenPathConfig = cookieAndHeaders_1.CookieConfig.getInstance().refreshTokenPath;
        if (refreshTokenPathConfig !== undefined) {
            return refreshTokenPathConfig;
        }
        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
        return handShakeInfo.refreshTokenPath;
    });
}
function middleware(antiCsrfCheck) {
    // We know this should be Request but then Type
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                if (request.method.toLowerCase() === "options" || request.method.toLowerCase() === "trace") {
                    return next();
                }
                let path = request.originalUrl.split("?")[0];
                let refreshTokenPath = yield getRefreshPath();
                if (
                    (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                    request.method.toLowerCase() === "post"
                ) {
                    request.session = yield express_1.refreshSession(request, response);
                } else {
                    if (antiCsrfCheck === undefined) {
                        antiCsrfCheck = request.method.toLowerCase() !== "get";
                    }
                    request.session = yield express_1.getSession(request, response, antiCsrfCheck);
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.middleware = middleware;
function errorHandler(options) {
    return OriginalMiddleware.errorHandler(options);
}
exports.errorHandler = errorHandler;
//# sourceMappingURL=middleware.js.map
