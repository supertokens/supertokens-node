"use strict";
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
const constants_1 = require("../constants");
const supertokens_1 = require("../../supertokens");
class AWSRequest extends request_1.BaseRequest {
    constructor(event) {
        super();
        this.getKeyValueFromQuery = (key) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.event.queryStringParameters === undefined || this.event.queryStringParameters === null) {
                    return undefined;
                }
                let value = this.event.queryStringParameters[key];
                if (value === undefined || typeof value !== "string") {
                    return undefined;
                }
                return value;
            });
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.parsedJSONBody === undefined) {
                    if (this.event.body === null || this.event.body === undefined) {
                        this.parsedJSONBody = {};
                    } else {
                        this.parsedJSONBody = JSON.parse(this.event.body);
                        if (this.parsedJSONBody === undefined) {
                            this.parsedJSONBody = {};
                        }
                    }
                }
                return this.parsedJSONBody;
            });
        this.getMethod = () => {
            let rawMethod = this.event.httpMethod;
            if (rawMethod !== undefined) {
                return utils_1.normaliseHttpMethod(rawMethod);
            }
            return utils_1.normaliseHttpMethod(this.event.requestContext.http.method);
        };
        this.getCookieValue = (key) => {
            let cookies = this.event.cookies;
            if (
                (this.event.headers === undefined || this.event.headers === null) &&
                (cookies === undefined || cookies === null)
            ) {
                return undefined;
            }
            let value = utils_2.getCookieValueFromHeaders(this.event.headers, key);
            if (value === undefined && cookies !== undefined && cookies !== null) {
                value = utils_2.getCookieValueFromHeaders(
                    {
                        cookie: cookies.join(";"),
                    },
                    key
                );
            }
            return value;
        };
        this.getHeaderValue = (key) => {
            if (this.event.headers === undefined || this.event.headers === null) {
                return undefined;
            }
            return utils_2.normalizeHeaderValue(this.event.headers[key]);
        };
        this.getOriginalURL = () => {
            let path = this.event.path;
            if (path === undefined) {
                path = this.event.requestContext.http.path;
                let stage = this.event.requestContext.stage;
                if (stage !== undefined && path.startsWith(`/${stage}`)) {
                    path = path.slice(stage.length + 1);
                }
            }
            return path;
        };
        this.original = event;
        this.event = event;
        this.parsedJSONBody = undefined;
    }
}
exports.AWSRequest = AWSRequest;
class AWSResponse extends response_1.BaseResponse {
    constructor(event) {
        super();
        this.setHeader = (key, value, allowDuplicateKey) => {
            this.event.supertokens.response.headers.push({
                key,
                value,
                allowDuplicateKey,
            });
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
            this.event.supertokens.response.cookies.push(serialisedCookie);
        };
        /**
         * @param {number} statusCode
         */
        this.setStatusCode = (statusCode) => {
            this.statusCode = statusCode;
        };
        this.sendJSONResponse = (content) => {
            this.content = JSON.stringify(content);
            this.setHeader("Context-Type", "application/json", false);
            this.responseSet = true;
        };
        this.sendResponse = (response) => {
            let headers = response.headers;
            if (headers === undefined) {
                headers = {};
            }
            let body = response.body;
            let statusCode = response.statusCode;
            if (this.responseSet) {
                statusCode = this.statusCode;
                body = this.content;
            }
            let supertokensHeaders = this.event.supertokens.response.headers;
            let supertokensCookies = this.event.supertokens.response.cookies;
            for (let i = 0; i < supertokensHeaders.length; i++) {
                let currentValue = undefined;
                let currentHeadersSet = Object.keys(headers === undefined ? [] : headers);
                for (let j = 0; j < currentHeadersSet.length; j++) {
                    if (currentHeadersSet[j].toLowerCase() === supertokensHeaders[i].key.toLowerCase()) {
                        supertokensHeaders[i].key = currentHeadersSet[j];
                        currentValue = headers[currentHeadersSet[j]];
                        break;
                    }
                }
                if (supertokensHeaders[i].allowDuplicateKey && currentValue !== undefined) {
                    let newValue = `${currentValue}, ${supertokensHeaders[i].value}`;
                    headers[supertokensHeaders[i].key] = newValue;
                } else {
                    headers[supertokensHeaders[i].key] = supertokensHeaders[i].value;
                }
            }
            if (this.event.version !== undefined) {
                let cookies = response.cookies;
                if (cookies === undefined) {
                    cookies = [];
                }
                cookies.push(...supertokensCookies);
                let result = Object.assign(Object.assign({}, response), { cookies, body, statusCode, headers });
                return result;
            } else {
                let multiValueHeaders = response.multiValueHeaders;
                if (multiValueHeaders === undefined) {
                    multiValueHeaders = {};
                }
                let headsersInMultiValueHeaders = Object.keys(multiValueHeaders);
                let cookieHeader = headsersInMultiValueHeaders.find(
                    (h) => h.toLowerCase() === constants_1.COOKIE_HEADER.toLowerCase()
                );
                if (cookieHeader === undefined) {
                    multiValueHeaders[constants_1.COOKIE_HEADER] = supertokensCookies;
                } else {
                    multiValueHeaders[cookieHeader].push(...supertokensCookies);
                }
                let result = Object.assign(Object.assign({}, response), {
                    multiValueHeaders,
                    body: body,
                    statusCode: statusCode,
                    headers,
                });
                return result;
            }
        };
        this.original = event;
        this.event = event;
        this.statusCode = 200;
        this.content = JSON.stringify({});
        this.responseSet = false;
        this.event.supertokens = {
            response: {
                headers: [],
                cookies: [],
            },
        };
    }
}
exports.AWSResponse = AWSResponse;
exports.middleware = (handler) => {
    return (event, context, callback) =>
        __awaiter(void 0, void 0, void 0, function* () {
            let supertokens = supertokens_1.default.getInstanceOrThrowError();
            let request = new AWSRequest(event);
            let response = new AWSResponse(event);
            try {
                let result = yield supertokens.middleware(request, response);
                if (result) {
                    return response.sendResponse({});
                }
                if (handler !== undefined) {
                    let handlerResult = yield handler(event, context, callback);
                    return response.sendResponse(handlerResult);
                }
                return response.sendResponse({});
            } catch (err) {
                supertokens.errorHandler(err, request, response);
                if (response.responseSet) {
                    return response.sendResponse({});
                }
                throw err;
            }
        });
};
exports.AWSWrapper = {
    middleware: exports.middleware,
    wrapRequest: (unwrapped) => {
        return new AWSRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new AWSResponse(unwrapped);
    },
};
//# sourceMappingURL=framework.js.map
