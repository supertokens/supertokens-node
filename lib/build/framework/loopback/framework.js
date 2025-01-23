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
exports.LoopbackWrapper = exports.middleware = exports.LoopbackResponse = exports.LoopbackRequest = void 0;
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
const supertokens_1 = __importDefault(require("../../supertokens"));
class LoopbackRequest extends request_1.BaseRequest {
    constructor(ctx) {
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
            return this.request.originalUrl;
        };
        this.original = ctx.request;
        this.request = ctx.request;
    }
}
exports.LoopbackRequest = LoopbackRequest;
class LoopbackResponse extends response_1.BaseResponse {
    constructor(ctx) {
        super();
        this.sendHTMLResponse = (html) => {
            if (!this.response.writableEnded) {
                this.response.set("Content-Type", "text/html");
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
const middleware = async (ctx, next) => {
    let supertokens = supertokens_1.default.getInstanceOrThrowError();
    let request = new LoopbackRequest(ctx);
    let response = new LoopbackResponse(ctx);
    const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
    try {
        let result = await supertokens.middleware(request, response, userContext);
        if (!result) {
            return await next();
        }
        return;
    } catch (err) {
        return await supertokens.errorHandler(err, request, response, userContext);
    }
};
exports.middleware = middleware;
exports.LoopbackWrapper = {
    middleware: exports.middleware,
    wrapRequest: (unwrapped) => {
        return new LoopbackRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new LoopbackResponse(unwrapped);
    },
};
