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
const utils_1 = require("../utils");
const request_1 = require("./request");
const response_1 = require("./response");
const utils_2 = require("./utils");
const supertokens_1 = require("../supertokens");
const recipe_1 = require("../recipe/session/recipe");
class HapiRequest extends request_1.BaseRequest {
    constructor(request) {
        super();
        this.getKeyValueFromQuery = (key) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.request.query === undefined) {
                    return undefined;
                }
                let value = this.request.query[key];
                if (value === undefined || typeof value !== "string") {
                    return undefined;
                }
                return value;
            });
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                return this.request.payload === undefined || this.request.payload === null ? {} : this.request.payload;
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
            return this.request.url.toString();
        };
        this.request = request;
    }
}
exports.HapiRequest = HapiRequest;
class HapiResponse extends response_1.BaseResponse {
    constructor(response) {
        super();
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                this.response.lazyHeaderBindings(key, value, allowDuplicateKey);
                let existingHeaders = this.response.response().headers;
                let existingValue = existingHeaders[key.toLowerCase()];
                // we have the this.response.header for compatibility with nextJS
                if (existingValue === undefined) {
                    this.response.response().header(key, value);
                } else if (allowDuplicateKey) {
                    this.response.response().header(key, existingValue + ", " + value);
                } else {
                    // we overwrite the current one with the new one
                    this.response.response().header(key, value);
                }
            } catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            let now = Date.now();
            if (expires > now) {
                this.response.state(key, value, {
                    isHttpOnly: httpOnly,
                    isSecure: secure,
                    path: path,
                    domain,
                    ttl: expires - now,
                    isSameSite: sameSite === "lax" ? "Lax" : sameSite === "none" ? "None" : "Strict",
                });
            } else {
                this.response.unstate(key);
            }
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
            this.content = content;
            this.responseSet = true;
        };
        this.sendResponse = () => {
            return this.response.response(this.content).code(this.statusCode).takeover();
        };
        this.response = response;
        this.statusCode = 200;
        this.content = null;
        this.responseSet = false;
    }
}
exports.HapiResponse = HapiResponse;
const plugin = {
    name: "supertokens-hapi-middleware",
    version: "1.0.0",
    register: function (server, _) {
        return __awaiter(this, void 0, void 0, function* () {
            server.ext("onPreHandler", (req, h) =>
                __awaiter(this, void 0, void 0, function* () {
                    let supertokens = supertokens_1.default.getInstanceOrThrowError();
                    let request = new HapiRequest(req);
                    let response = new HapiResponse(h);
                    let result = yield supertokens.middleware(request, response);
                    if (!result) {
                        return h.continue;
                    }
                    return response.sendResponse();
                })
            );
            server.ext("onPreResponse", (request, h) =>
                __awaiter(this, void 0, void 0, function* () {
                    (request.app.lazyHeaders || []).forEach(({ key, value, allowDuplicateKey }) => {
                        if (request.response.isBoom) {
                            request.response.output.headers[key] = value;
                        } else {
                            request.response.header(key, value, { append: allowDuplicateKey });
                        }
                    });
                    if (request.response.isBoom) {
                        let err = request.response.data;
                        let supertokens = supertokens_1.default.getInstanceOrThrowError();
                        let req = new HapiRequest(request);
                        let res = new HapiResponse(h);
                        if (err !== undefined && err !== null) {
                            try {
                                supertokens.errorHandler(err, req, res);
                                if (res.responseSet) {
                                    return res.sendResponse();
                                }
                                return h.continue;
                            } catch (e) {
                                return h.continue;
                            }
                        }
                    }
                    return h.continue;
                })
            );
            server.decorate("toolkit", "lazyHeaderBindings", function (key, value, allowDuplicateKey) {
                const h = this;
                h.request.app.lazyHeaders = h.request.app.lazyHeaders || [];
                h.request.app.lazyHeaders.push({ key, value, allowDuplicateKey });
            });
            server.route({
                path: "/{url*}",
                method: "*",
                handler: (_, h) => {
                    return h.continue;
                },
            });
        });
    },
};
const middleware = () => {
    return plugin;
};
const verifySession = (options) => {
    return (req, h) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let sessionRecipe = recipe_1.default.getInstanceOrThrowError();
            let request = new HapiRequest(req);
            let response = new HapiResponse(h);
            req.session = yield sessionRecipe.verifySession(options, request, response);
            return h.continue;
        });
};
const HapiWrapper = {
    middleware,
    errorHandler: () => {},
    verifySession,
    wrapRequest: (unwrapped) => {
        return new HapiRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new HapiResponse(unwrapped);
    },
};
exports.default = HapiWrapper;
//# sourceMappingURL=hapi.js.map
