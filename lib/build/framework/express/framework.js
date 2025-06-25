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
exports.ExpressWrapper =
    exports.errorHandler =
    exports.middleware =
    exports.ExpressResponse =
    exports.ExpressRequest =
        void 0;
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
const supertokens_1 = __importDefault(require("../../supertokens"));
class ExpressRequest extends request_1.BaseRequest {
    constructor(request) {
        super();
        this.getFormDataFromRequestBody = async () => {
            await (0, utils_2.assertFormDataBodyParserHasBeenUsedForExpressLikeRequest)(this.request);
            return this.request.body;
        };
        this.getJSONFromRequestBody = async () => {
            await (0, utils_2.assertThatBodyParserHasBeenUsedForExpressLikeRequest)(this.getMethod(), this.request);
            return this.request.body;
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
            return (0, utils_2.getCookieValueFromIncomingMessage)(this.request, key);
        };
        this.getHeaderValue = (key) => {
            return (0, utils_2.getHeaderValueFromIncomingMessage)(this.request, key);
        };
        this.getOriginalURL = () => {
            return this.request.originalUrl || this.request.url;
        };
        this.original = request;
        this.request = request;
    }
}
exports.ExpressRequest = ExpressRequest;
class ExpressResponse extends response_1.BaseResponse {
    constructor(response) {
        super();
        this.sendHTMLResponse = (html) => {
            if (!this.response.writableEnded) {
                /**
                 * response.set method is not available if response
                 * is a nextjs response object. setHeader method
                 * is present on OutgoingMessage which is one of the
                 * bases used to construct response object for express
                 * like response as well as nextjs like response
                 */
                this.response.setHeader("Content-Type", "text/html");
                this.response.status(this.statusCode).send(html);
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            (0, utils_2.setHeaderForExpressLikeResponse)(this.response, key, value, allowDuplicateKey);
        };
        this.removeHeader = (key) => {
            this.response.removeHeader(key);
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            (0, utils_2.setCookieForServerResponse)(
                this.response,
                key,
                value,
                domain,
                secure,
                httpOnly,
                expires,
                path,
                sameSite
            );
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            if (!this.response.writableEnded) {
                this.statusCode = statusCode;
            }
        };
        this.sendJSONResponse = (content) => {
            if (!this.response.writableEnded) {
                this.response.status(this.statusCode).json(content);
            }
        };
        this.original = response;
        this.response = response;
        this.statusCode = 200;
    }
}
exports.ExpressResponse = ExpressResponse;
const middleware = () => {
    return async (req, res, next) => {
        let supertokens;
        const request = new ExpressRequest(req);
        const response = new ExpressResponse(res);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            supertokens = supertokens_1.default.getInstanceOrThrowError();
            const result = await supertokens.middleware(request, response, userContext);
            if (!result) {
                return next();
            }
        } catch (err) {
            if (supertokens) {
                try {
                    await supertokens.errorHandler(err, request, response, userContext);
                } catch (_a) {
                    next(err);
                }
            } else {
                next(err);
            }
        }
    };
};
exports.middleware = middleware;
const errorHandler = () => {
    return async (err, req, res, next) => {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        let request = new ExpressRequest(req);
        let response = new ExpressResponse(res);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            await supertokens.errorHandler(err, request, response, userContext);
        } catch (err) {
            return next(err);
        }
    };
};
exports.errorHandler = errorHandler;
exports.ExpressWrapper = {
    middleware: exports.middleware,
    errorHandler: exports.errorHandler,
    wrapRequest: (unwrapped) => {
        return new ExpressRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new ExpressResponse(unwrapped);
    },
};
