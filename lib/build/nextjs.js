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
const _1 = require(".");
const session_1 = require("./recipe/session");
function next(request, response, resolve, reject) {
    return function (middlewareError) {
        return __awaiter(this, void 0, void 0, function* () {
            if (middlewareError !== undefined) {
                _1.default.errorHandler()(middlewareError, request, response, (errorHandlerError) => {
                    if (errorHandlerError !== undefined) {
                        reject(errorHandlerError);
                    }
                    return resolve();
                });
                return;
            }
            return resolve();
        });
    };
}
class NextJS {
    static superTokensMiddleware(request, response) {
        return new Promise((resolve, reject) => {
            return _1.default.middleware()(request, response, next(request, response, resolve, reject));
        });
    }
    static superTokensVerifySession(request, response) {
        return new Promise((resolve, reject) => {
            //  When called from getServerSideProps, we want to resolve and use req.session afterwards to check for existing session.
            if (response.json === undefined) {
                response.json = () => {
                    return resolve();
                };
            }
            return session_1.default.verifySession()(request, response, next(request, response, resolve, reject));
        });
    }
}
exports.default = NextJS;
exports.superTokensMiddleware = NextJS.superTokensMiddleware;
exports.superTokensVerifySession = NextJS.superTokensVerifySession;
//# sourceMappingURL=nextjs.js.map
