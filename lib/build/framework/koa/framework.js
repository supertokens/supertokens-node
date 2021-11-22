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
const co_body_1 = require("co-body");
const supertokens_1 = require("../../supertokens");
class KoaRequest extends request_1.BaseRequest {
    constructor(ctx) {
        super();
        this.getFormData = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.parsedUrlEncodedFormData === undefined) {
                    this.parsedUrlEncodedFormData = yield parseURLEncodedFormData(this.ctx);
                }
                return this.parsedUrlEncodedFormData;
            });
        this.getKeyValueFromQuery = (key) => {
            if (this.ctx.query === undefined) {
                return undefined;
            }
            let value = this.ctx.request.query[key];
            if (value === undefined || typeof value !== "string") {
                return undefined;
            }
            return value;
        };
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.parsedJSONBody === undefined) {
                    this.parsedJSONBody = yield parseJSONBodyFromRequest(this.ctx);
                }
                return this.parsedJSONBody === undefined ? {} : this.parsedJSONBody;
            });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(this.ctx.request.method);
        };
        this.getCookieValue = (key) => {
            return this.ctx.cookies.get(key);
        };
        this.getHeaderValue = (key) => {
            return utils_2.getHeaderValueFromIncomingMessage(this.ctx.req, key);
        };
        this.getOriginalURL = () => {
            return this.ctx.originalUrl;
        };
        this.original = ctx;
        this.ctx = ctx;
        this.parsedJSONBody = undefined;
        this.parsedUrlEncodedFormData = undefined;
    }
}
exports.KoaRequest = KoaRequest;
function parseJSONBodyFromRequest(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ctx.body !== undefined) {
            return ctx.body;
        }
        return yield co_body_1.json(ctx);
    });
}
function parseURLEncodedFormData(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ctx.body !== undefined) {
            return ctx.body;
        }
        return yield co_body_1.form(ctx);
    });
}
class KoaResponse extends response_1.BaseResponse {
    constructor(ctx) {
        super();
        this.responseSet = false;
        this.statusSet = false;
        this.sendHTMLResponse = (html) => {
            if (!this.responseSet) {
                this.ctx.set("content-type", "text/html");
                this.ctx.body = html;
                this.responseSet = true;
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                let existingHeaders = this.ctx.response.headers;
                let existingValue = existingHeaders[key.toLowerCase()];
                if (existingValue === undefined) {
                    this.ctx.set(key, value);
                } else if (allowDuplicateKey) {
                    this.ctx.set(key, existingValue + ", " + value);
                } else {
                    // we overwrite the current one with the new one
                    this.ctx.set(key, value);
                }
            } catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            this.ctx.cookies.set(key, value, {
                secure,
                sameSite,
                httpOnly,
                expires: new Date(expires),
                domain,
                path,
            });
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            if (!this.statusSet) {
                this.ctx.status = statusCode;
                this.statusSet = true;
            }
        };
        this.sendJSONResponse = (content) => {
            if (!this.responseSet) {
                this.ctx.body = content;
                this.responseSet = true;
            }
        };
        this.original = ctx;
        this.ctx = ctx;
    }
}
exports.KoaResponse = KoaResponse;
exports.middleware = () => {
    return (ctx, next) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new KoaRequest(ctx);
            let response = new KoaResponse(ctx);
            try {
                let result = yield supertokens.middleware(request, response);
                if (!result) {
                    return yield next();
                }
            } catch (err) {
                return yield supertokens.errorHandler(err, request, response);
            }
        });
};
exports.KoaWrapper = {
    middleware: exports.middleware,
    wrapRequest: (unwrapped) => {
        return new KoaRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new KoaResponse(unwrapped);
    },
};
