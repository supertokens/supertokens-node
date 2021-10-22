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
const constants_1 = require("../constants");
class FastifyRequest extends request_1.BaseRequest {
    constructor(request) {
        super();
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
                return this.request.body;
            });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(this.request.method);
        };
        this.getCookieValue = (key) => {
            return utils_2.getCookieValueFromHeaders(this.request.headers, key);
        };
        this.getHeaderValue = (key) => {
            return utils_2.normalizeHeaderValue(this.request.headers[key]);
        };
        this.getOriginalURL = () => {
            return this.request.url;
        };
        this.original = request;
        this.request = request;
    }
}
exports.FastifyRequest = FastifyRequest;
class FastifyResponse extends response_1.BaseResponse {
    constructor(response) {
        super();
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                let existingHeaders = this.response.getHeaders();
                let existingValue = existingHeaders[key.toLowerCase()];
                // we have the this.response.header for compatibility with nextJS
                if (existingValue === undefined) {
                    this.response.header(key, value);
                } else if (allowDuplicateKey) {
                    this.response.header(key, existingValue + ", " + value);
                } else {
                    // we overwrite the current one with the new one
                    this.response.header(key, value);
                }
            } catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            let serialisedCookie = utils_2.serializeCookieValue(
                key,
                value,
                domain,
                secure,
                httpOnly,
                expires,
                path,
                sameSite
            );
            let prev = this.response.getHeader(constants_1.COOKIE_HEADER);
            let cookieValueToSetInHeader = utils_2.getCookieValueToSetInHeader(prev, serialisedCookie, key);
            this.response.header(constants_1.COOKIE_HEADER, cookieValueToSetInHeader);
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            this.statusCode = statusCode;
        };
        /**
         * @param {any} content
         */
        this.sendJSONResponse = (content) => {
            if (!this.response.sent) {
                this.response.statusCode = this.statusCode;
                this.response.send(content);
            }
        };
        this.original = response;
        this.response = response;
        this.statusCode = 200;
    }
}
exports.FastifyResponse = FastifyResponse;
function plugin(fastify, _, done) {
    fastify.addHook("preHandler", (req, reply) =>
        __awaiter(this, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new FastifyRequest(req);
            let response = new FastifyResponse(reply);
            try {
                yield supertokens.middleware(request, response);
            } catch (err) {
                yield supertokens.errorHandler(err, request, response);
            }
        })
    );
    done();
}
plugin[Symbol.for("skip-override")] = true;
exports.errorHandler = () => {
    return (err, req, res) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new FastifyRequest(req);
            let response = new FastifyResponse(res);
            yield supertokens.errorHandler(err, request, response);
        });
};
exports.FastifyWrapper = {
    plugin,
    errorHandler: exports.errorHandler,
    wrapRequest: (unwrapped) => {
        return new FastifyRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new FastifyResponse(unwrapped);
    },
};
