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
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
const supertokens_1 = require("../../supertokens");
class ExpressRequest extends request_1.BaseRequest {
    constructor(request) {
        super();
        this.getFormData = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (!this.formDataParserChecked) {
                    yield utils_2.assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(this.request);
                    this.formDataParserChecked = true;
                }
                return this.request.body;
            });
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
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (!this.parserChecked) {
                    yield utils_2.assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
                    this.parserChecked = true;
                }
                return this.request.body;
            });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(this.request.method);
        };
        this.getCookieValue = (key) => {
            return utils_2.getCookieValueFromIncomingMessage(this.request, key);
        };
        this.getHeaderValue = (key) => {
            return utils_2.getHeaderValueFromIncomingMessage(this.request, key);
        };
        this.getOriginalURL = () => {
            return this.request.originalUrl || this.request.url;
        };
        this.original = request;
        this.request = request;
        this.parserChecked = false;
        this.formDataParserChecked = false;
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
                this.response.status(this.statusCode).send(Buffer.from(html));
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            utils_2.setHeaderForExpressLikeResponse(this.response, key, value, allowDuplicateKey);
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            utils_2.setCookieForServerResponse(
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
exports.middleware = () => {
    return (req, res, next) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let supertokens;
            const request = new ExpressRequest(req);
            const response = new ExpressResponse(res);
            try {
                supertokens = supertokens_1.default.getInstanceOrThrowError();
                const result = yield supertokens.middleware(request, response);
                if (!result) {
                    return next();
                }
            } catch (err) {
                if (supertokens) {
                    try {
                        yield supertokens.errorHandler(err, request, response);
                    } catch (_a) {
                        next(err);
                    }
                } else {
                    next(err);
                }
            }
        });
};
exports.errorHandler = () => {
    return (err, req, res, next) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new ExpressRequest(req);
            let response = new ExpressResponse(res);
            try {
                yield supertokens.errorHandler(err, request, response);
            } catch (err) {
                return next(err);
            }
        });
};
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
