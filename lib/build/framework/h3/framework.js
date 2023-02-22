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
const h3_1 = require("h3");
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const supertokens_1 = require("../../supertokens");
class H3Request extends request_1.BaseRequest {
    constructor(event) {
        super();
        this.getFormData = () =>
            __awaiter(this, void 0, void 0, function* () {
                return h3_1.readBody(this.event);
            });
        this.getKeyValueFromQuery = (key) => {
            const query = h3_1.getQuery(this.event);
            if (query === undefined) {
                return undefined;
            }
            let value = query[key];
            if (value === undefined || typeof value !== "string") {
                return undefined;
            }
            return value;
        };
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                return h3_1.readBody(this.event);
            });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(h3_1.getMethod(this.event));
        };
        this.getCookieValue = (key) => {
            return h3_1.getCookie(this.event, key);
        };
        this.getHeaderValue = (key) => {
            return h3_1.getHeader(this.event, key);
        };
        this.getOriginalURL = () => {
            let path = this.event.path;
            if (!path) {
                throw new Error("Error while trying to get original url");
            }
            return path;
        };
        this.original = event;
        this.event = event;
    }
}
exports.H3Request = H3Request;
class H3Response extends response_1.BaseResponse {
    constructor(event) {
        super();
        this.sendHTMLResponse = (html) => {
            if (this.event.node.res.writable) {
                this.event.node.res.setHeader("Content-Type", "text/html");
                this.event.node.res.statusCode = this.statusCode;
                h3_1.send(this.event, html);
                // this.response.status(this.statusCode).send(Buffer.from(html));
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                let existingHeaders = this.event.node.res.getHeaders();
                let existingValue = existingHeaders[key.toLowerCase()];
                // we have the this.response.header for compatibility with nextJS
                if (existingValue === undefined) {
                    this.event.node.res.setHeader(key, value);
                } else if (allowDuplicateKey) {
                    this.event.node.res.setHeader(key, existingValue + ", " + value);
                } else {
                    // we overwrite the current one with the new one
                    this.event.node.res.setHeader(key, value);
                }
            } catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            h3_1.setCookie(this.event, key, value, {
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
            if (this.event.node.res.writable) {
                this.statusCode = statusCode;
            }
        };
        this.sendJSONResponse = (content) => {
            if (this.event.node.res.writable) {
                this.event.node.res.setHeader("Content-Type", "application/json");
                this.event.node.res.statusCode = this.statusCode;
                h3_1.send(this.event, content);
            }
        };
        this.original = event;
        this.event = event;
        this.statusCode = 200;
    }
}
exports.H3Response = H3Response;
exports.middleware = h3_1.eventHandler((event) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const supertokens = supertokens_1.default.getInstanceOrThrowError();
        const request = new H3Request(event);
        const response = new H3Response(event);
        try {
            yield supertokens.middleware(request, response);
        } catch (err) {
            yield supertokens.errorHandler(err, request, response);
        }
    })
);
exports.errorHandler = h3_1.eventHandler((event) => {
    const error = h3_1.createError({});
    h3_1.sendError(event, error);
});
exports.H3Wrapper = {
    middleware: exports.middleware,
    errorHandler: exports.errorHandler,
    wrapRequest: (unwrapped) => {
        return new H3Request(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new H3Response(unwrapped);
    },
};
