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
class LoopbackRequest extends request_1.BaseRequest {
    constructor(ctx) {
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
            return this.request.originalUrl;
        };
        this.original = ctx.request;
        this.request = ctx.request;
        this.parserChecked = false;
        this.formDataParserChecked = false;
    }
}
exports.LoopbackRequest = LoopbackRequest;
class LoopbackResponse extends response_1.BaseResponse {
    constructor(ctx) {
        super();
        this.sendHTMLResponse = (html) => {
            if (!this.response.writableEnded) {
                this.response.set("Content-Type", "text/html");
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
        this.original = ctx.response;
        this.response = ctx.response;
        this.statusCode = 200;
    }
}
exports.LoopbackResponse = LoopbackResponse;
exports.middleware = (ctx, next) =>
    __awaiter(void 0, void 0, void 0, function* () {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        let request = new LoopbackRequest(ctx);
        let response = new LoopbackResponse(ctx);
        try {
            let result = yield supertokens.middleware(request, response);
            if (!result) {
                return yield next();
            }
            return;
        } catch (err) {
            return yield supertokens.errorHandler(err, request, response);
        }
    });
exports.LoopbackWrapper = {
    middleware: exports.middleware,
    wrapRequest: (unwrapped) => {
        return new LoopbackRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new LoopbackResponse(unwrapped);
    },
};
