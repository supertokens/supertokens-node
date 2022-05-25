"use strict";
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
const express_1 = require("./framework/express");
function next(request, response, resolve, reject) {
    return function (middlewareError) {
        return __awaiter(this, void 0, void 0, function* () {
            if (middlewareError === undefined) {
                return resolve();
            }
            yield express_1.errorHandler()(middlewareError, request, response, (errorHandlerError) => {
                if (errorHandlerError !== undefined) {
                    return reject(errorHandlerError);
                }
                // do nothing, error handler does not resolve the promise.
            });
        });
    };
}
class NextJS {
    static superTokensNextWrapper(middleware, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) =>
                __awaiter(this, void 0, void 0, function* () {
                    request.__supertokensFromNextJS = true;
                    try {
                        let callbackCalled = false;
                        const result = yield middleware((err) => {
                            callbackCalled = true;
                            next(request, response, resolve, reject)(err);
                        });
                        if (!callbackCalled && !response.finished && !response.headersSent) {
                            return resolve(result);
                        }
                    } catch (err) {
                        yield express_1.errorHandler()(err, request, response, (errorHandlerError) => {
                            if (errorHandlerError !== undefined) {
                                return reject(errorHandlerError);
                            }
                            // do nothing, error handler does not resolve the promise.
                        });
                    }
                })
            );
        });
    }
}
exports.default = NextJS;
exports.superTokensNextWrapper = NextJS.superTokensNextWrapper;
