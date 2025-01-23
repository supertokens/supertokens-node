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
exports.HapiWrapper = exports.HapiResponse = exports.HapiRequest = void 0;
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
const supertokens_1 = __importDefault(require("../../supertokens"));
class HapiRequest extends request_1.BaseRequest {
    constructor(request) {
        super();
        this.getFormDataFromRequestBody = async () => {
            return this.request.payload === undefined || this.request.payload === null ? {} : this.request.payload;
        };
        this.getJSONFromRequestBody = async () => {
            return this.request.payload === undefined || this.request.payload === null ? {} : this.request.payload;
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
            return (0, utils_2.getCookieValueFromHeaders)(this.request.headers, key);
        };
        this.getHeaderValue = (key) => {
            return (0, utils_2.normalizeHeaderValue)(this.request.headers[key]);
        };
        this.getOriginalURL = () => {
            return this.request.url.toString();
        };
        this.original = request;
        this.request = request;
    }
}
exports.HapiRequest = HapiRequest;
class HapiResponse extends response_1.BaseResponse {
    constructor(response) {
        super();
        this.statusSet = false;
        this.sendHTMLResponse = (html) => {
            if (!this.responseSet) {
                this.content = html;
                this.setHeader("Content-Type", "text/html", false);
                this.responseSet = true;
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                this.response.lazyHeaderBindings(this.response, key, value, allowDuplicateKey);
            } catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.removeHeader = (key) => {
            this.response.lazyHeaderBindings(this.response, key, undefined, false);
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            let now = Date.now();
            const cookieOptions = {
                isHttpOnly: httpOnly,
                isSecure: secure,
                path: path,
                domain,
                ttl: expires - now,
                isSameSite: sameSite === "lax" ? "Lax" : sameSite === "none" ? "None" : "Strict",
            };
            if (expires > now) {
                this.response.state(key, value, cookieOptions);
            } else {
                this.response.unstate(key, cookieOptions);
            }
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            if (!this.statusSet) {
                this.statusCode = statusCode;
                this.statusSet = true;
            }
        };
        /**
         * @param {any} content
         */
        this.sendJSONResponse = (content) => {
            if (!this.responseSet) {
                this.content = content;
                this.responseSet = true;
            }
        };
        this.sendResponse = (overwriteHeaders = false) => {
            if (!overwriteHeaders) {
                return this.response.response(this.content).code(this.statusCode).takeover();
            }
            return this.response.response(this.content).code(this.statusCode);
        };
        this.original = response;
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
    register: async function (server, _) {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        server.ext("onPreHandler", async (req, h) => {
            let request = new HapiRequest(req);
            let response = new HapiResponse(h);
            const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
            let result = await supertokens.middleware(request, response, userContext);
            if (!result) {
                return h.continue;
            }
            return response.sendResponse();
        });
        server.ext("onPreResponse", async (request, h) => {
            (request.app.lazyHeaders || []).forEach(({ key, value, allowDuplicateKey }) => {
                if (request.response.isBoom) {
                    request.response.output.headers[key] = value;
                } else {
                    request.response.header(key, value, { append: allowDuplicateKey });
                }
            });
            if (request.response.isBoom) {
                let err = request.response.data || request.response;
                let req = new HapiRequest(request);
                let res = new HapiResponse(h);
                const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(req);
                if (err !== undefined && err !== null) {
                    try {
                        await supertokens.errorHandler(err, req, res, userContext);
                        if (res.responseSet) {
                            let resObj = res.sendResponse(true);
                            (request.app.lazyHeaders || []).forEach(({ key, value, allowDuplicateKey }) => {
                                resObj.header(key, value, { append: allowDuplicateKey });
                            });
                            return resObj.takeover();
                        }
                        return h.continue;
                    } catch (e) {
                        return h.continue;
                    }
                }
            }
            return h.continue;
        });
        server.decorate("toolkit", "lazyHeaderBindings", function (h, key, value, allowDuplicateKey) {
            const anyApp = h.request.app;
            anyApp.lazyHeaders = anyApp.lazyHeaders || [];
            if (value === undefined) {
                anyApp.lazyHeaders = anyApp.lazyHeaders.filter(
                    (header) => header.key.toLowerCase() !== key.toLowerCase()
                );
            } else {
                anyApp.lazyHeaders.push({ key, value, allowDuplicateKey });
            }
        });
        let supportedRoutes = [];
        let methodsSupported = new Set();
        for (let i = 0; i < supertokens.recipeModules.length; i++) {
            let apisHandled = supertokens.recipeModules[i].getAPIsHandled();
            for (let j = 0; j < apisHandled.length; j++) {
                let api = apisHandled[j];
                if (!api.disabled) {
                    methodsSupported.add(api.method);
                }
            }
        }
        /**
         * Hapi requires that all API paths are registered before the server starts listening.
         * When using multi-tenancy the tenant id is passed as part of the request path. Because
         * this id is dynamic and unkown when starting the server, it is not possible for us to
         * declare all APIs with the tenant id in the path. Because of this requests with tenant id
         * in the path would give a 404.
         *
         * To solve this we use wildcards after the base path for all the requests. This will make
         * sure that Hapi forwards requests to our handler which will in turn forward to the
         * middleware. The middleware processes the full request URL so the logic will remain intact.
         */
        supportedRoutes.push({
            path: `${supertokens.appInfo.apiBasePath.getAsStringDangerous()}/{path*}`,
            method: [...methodsSupported],
            handler: (_, h) => {
                return h.continue;
            },
        });
        server.route(supportedRoutes);
    },
};
exports.HapiWrapper = {
    plugin,
    wrapRequest: (unwrapped) => {
        return new HapiRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new HapiResponse(unwrapped);
    },
};
