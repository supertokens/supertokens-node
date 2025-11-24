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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFrameworkWrapper =
    exports.errorHandler =
    exports.middleware =
    exports.CollectingResponse =
    exports.PreParsedRequest =
        void 0;
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const supertokens_1 = __importDefault(require("../../supertokens"));
const nodeHeaders_1 = __importDefault(require("./nodeHeaders"));
class PreParsedRequest extends request_1.BaseRequest {
    get session() {
        return this._session;
    }
    set session(value) {
        this._session = value;
        if (value !== undefined && this.request.setSession !== undefined) {
            this.request.setSession(value);
        }
    }
    constructor(request) {
        super();
        this.getJSONFromRequestBody = () => {
            return this.request.getJSONBody();
        };
        this.getFormDataFromRequestBody = () => {
            return this.request.getFormBody();
        };
        this.getKeyValueFromQuery = (key) => {
            if (this.request.query === undefined) {
                return undefined;
            }
            let value = this.request.query[key];
            if (value === undefined || typeof value !== "string") {
                return undefined;
            }
            return value;
        };
        this.getMethod = () => {
            return (0, utils_1.normaliseHttpMethod)(this.request.method);
        };
        this.getCookieValue = (key) => {
            return this.request.cookies[key];
        };
        this.getHeaderValue = (key) => {
            var _a;
            return (_a = this.request.headers.get(key)) !== null && _a !== void 0 ? _a : undefined;
        };
        this.getOriginalURL = () => {
            return this.request.url;
        };
        this.original = request;
        this.request = request;
    }
}
exports.PreParsedRequest = PreParsedRequest;
class CollectingResponse extends response_1.BaseResponse {
    constructor() {
        super();
        this.sendHTMLResponse = (html) => {
            this.headers.set("Content-Type", "text/html");
            this.body = html;
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            var _a;
            if (allowDuplicateKey) {
                /**
                    We only want to append if it does not already exist
                    For example if the caller is trying to add front token to the access control exposed headers property
                    we do not want to append if something else had already added it
                */
                if (!((_a = this.headers.get(key)) === null || _a === void 0 ? void 0 : _a.includes(value))) {
                    this.headers.append(key, value);
                }
            } else {
                this.headers.set(key, value);
            }
        };
        this.removeHeader = (key) => {
            this.headers.delete(key);
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            this.cookies.push({ key, value, domain, secure, httpOnly, expires, path, sameSite });
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            this.statusCode = statusCode;
        };
        this.sendJSONResponse = (content) => {
            this.headers.set("Content-Type", "application/json");
            this.body = JSON.stringify(content);
        };
        // In node16 the Headers class is only supported behind an experimental flag, so we sometimes need to add an implementation for it
        // Still, if available we are using the built-in (node 18+)
        if (typeof Headers === "undefined") {
            this.headers = new nodeHeaders_1.default(null);
        } else {
            this.headers = new Headers();
        }
        this.statusCode = 200;
        this.cookies = [];
    }
}
exports.CollectingResponse = CollectingResponse;
const identity = (i) => i;
const middleware = (wrapRequest = identity, wrapResponse = identity) => {
    return async (request, response, next) => {
        const wrappedReq = wrapRequest(request);
        const wrappedResp = wrapResponse(response);
        let supertokens;
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(wrappedReq);
        try {
            supertokens = supertokens_1.default.getInstanceOrThrowError();
            const result = await supertokens.middleware(wrappedReq, wrappedResp, userContext);
            if (!result) {
                if (next) {
                    next();
                }
                return { handled: false };
            }
            return { handled: true };
        } catch (err) {
            if (supertokens) {
                try {
                    await supertokens.errorHandler(err, wrappedReq, wrappedResp, userContext);
                    return { handled: true };
                } catch (_a) {
                    if (next) {
                        next(err);
                    }
                    return { error: err };
                }
            } else {
                if (next) {
                    next(err);
                }
                return { error: err };
            }
        }
    };
};
exports.middleware = middleware;
const errorHandler = () => {
    return async (err, request, response, next) => {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            await supertokens.errorHandler(err, request, response, userContext);
            return next();
        } catch (err) {
            return next(err);
        }
    };
};
exports.errorHandler = errorHandler;
exports.CustomFrameworkWrapper = {
    middleware: exports.middleware,
    errorHandler: exports.errorHandler,
};
