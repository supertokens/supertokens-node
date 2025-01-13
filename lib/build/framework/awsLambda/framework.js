"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSWrapper = exports.middleware = exports.AWSResponse = exports.AWSRequest = void 0;
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
const constants_1 = require("../constants");
const supertokens_1 = __importDefault(require("../../supertokens"));
const error_1 = __importDefault(require("../../error"));
class AWSRequest extends request_1.BaseRequest {
    constructor(event) {
        super();
        this.getFormDataFromRequestBody = async () => {
            if (this.event.body === null || this.event.body === undefined) {
                return {};
            } else {
                try {
                    const parsedUrlEncodedFormData = Object.fromEntries(new URLSearchParams(this.event.body).entries());
                    return parsedUrlEncodedFormData === undefined ? {} : parsedUrlEncodedFormData;
                } catch (err) {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "API input error: Please make sure to pass valid url encoded form in the request body",
                    });
                }
            }
        };
        this.getJSONFromRequestBody = async () => {
            if (this.event.body === null || this.event.body === undefined) {
                return {};
            } else {
                const parsedJSONBody = JSON.parse(this.event.body);
                return parsedJSONBody === undefined ? {} : parsedJSONBody;
            }
        };
        this.getKeyValueFromQuery = (key) => {
            if (this.event.queryStringParameters === undefined || this.event.queryStringParameters === null) {
                return undefined;
            }
            let value = this.event.queryStringParameters[key];
            if (value === undefined || typeof value !== "string") {
                return undefined;
            }
            return value;
        };
        this.getMethod = () => {
            let rawMethod = this.event.httpMethod;
            if (rawMethod !== undefined) {
                return (0, utils_1.normaliseHttpMethod)(rawMethod);
            }
            return (0, utils_1.normaliseHttpMethod)(this.event.requestContext.http.method);
        };
        this.getCookieValue = (key) => {
            let cookies = this.event.cookies;
            if (
                (this.event.headers === undefined || this.event.headers === null) &&
                (cookies === undefined || cookies === null)
            ) {
                return undefined;
            }
            let value = (0, utils_2.getCookieValueFromHeaders)(this.event.headers, key);
            if (value === undefined && cookies !== undefined && cookies !== null) {
                value = (0, utils_2.getCookieValueFromHeaders)(
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
            return (0, utils_2.normalizeHeaderValue)(
                (0, utils_1.getFromObjectCaseInsensitive)(key, this.event.headers)
            );
        };
        this.getOriginalURL = () => {
            let path = this.event.path;
            let queryParams = this.event.queryStringParameters;
            if (path === undefined) {
                path = this.event.requestContext.http.path;
                let stage = this.event.requestContext.stage;
                if (stage !== undefined && path.startsWith(`/${stage}`)) {
                    path = path.slice(stage.length + 1);
                }
                if (queryParams !== undefined && queryParams !== null) {
                    let urlString = "https://exmaple.com" + path;
                    let url = new URL(urlString);
                    Object.keys(queryParams).forEach((el) => url.searchParams.append(el, queryParams[el]));
                    path = url.pathname + url.search;
                }
            }
            return path;
        };
        this.original = event;
        this.event = event;
    }
}
exports.AWSRequest = AWSRequest;
class AWSResponse extends response_1.BaseResponse {
    constructor(event) {
        super();
        this.sendHTMLResponse = (html) => {
            if (!this.responseSet) {
                this.content = html;
                this.setHeader("Content-Type", "text/html", false);
                this.responseSet = true;
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            this.event.supertokens.response.headers.push({
                key,
                value,
                allowDuplicateKey,
            });
        };
        this.removeHeader = (key) => {
            this.event.supertokens.response.headers = this.event.supertokens.response.headers.filter(
                (header) => header.key.toLowerCase() !== key.toLowerCase()
            );
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            let serialisedCookie = (0, utils_2.serializeCookieValue)(
                key,
                value,
                domain,
                secure,
                httpOnly,
                expires,
                path,
                sameSite
            );
            this.event.supertokens.response.cookies = [
                ...this.event.supertokens.response.cookies.filter((c) => !c.startsWith(key + "=")),
                serialisedCookie,
            ];
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
        this.sendJSONResponse = (content) => {
            if (!this.responseSet) {
                this.content = JSON.stringify(content);
                this.setHeader("Content-Type", "application/json", false);
                this.responseSet = true;
            }
        };
        this.sendResponse = (response) => {
            if (response === undefined) {
                response = {};
            }
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
                    /**
                        We only want to append if it does not already exist
                        For example if the caller is trying to add front token to the access control exposed headers property
                        we do not want to append if something else had already added it
                    */
                    if (
                        typeof currentValue !== "string" ||
                        !currentValue.includes(supertokensHeaders[i].value.toString())
                    ) {
                        let newValue = `${currentValue}, ${supertokensHeaders[i].value}`;
                        headers[supertokensHeaders[i].key] = newValue;
                    }
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
        this.statusSet = false;
        this.event.supertokens = {
            response: {
                headers: [],
                cookies: [],
            },
        };
    }
}
exports.AWSResponse = AWSResponse;
const middleware = (handler) => {
    return async (event, context, callback) => {
        let supertokens = supertokens_1.default.getInstanceOrThrowError();
        let request = new AWSRequest(event);
        let response = new AWSResponse(event);
        const userContext = (0, utils_1.makeDefaultUserContextFromAPI)(request);
        try {
            let result = await supertokens.middleware(request, response, userContext);
            if (result) {
                return response.sendResponse();
            }
            if (handler !== undefined) {
                let handlerResult = await handler(event, context, callback);
                return response.sendResponse(handlerResult);
            }
            /**
             * it reaches this point only if the API route was not exposed by
             * the SDK and user didn't provide a handler
             */
            response.setStatusCode(404);
            response.sendJSONResponse({
                error: `The middleware couldn't serve the API path ${request.getOriginalURL()}, method: ${request.getMethod()}. If this is an unexpected behaviour, please create an issue here: https://github.com/supertokens/supertokens-node/issues`,
            });
            return response.sendResponse();
        } catch (err) {
            await supertokens.errorHandler(err, request, response, userContext);
            if (response.responseSet) {
                return response.sendResponse();
            }
            throw err;
        }
    };
};
exports.middleware = middleware;
exports.AWSWrapper = {
    middleware: exports.middleware,
    wrapRequest: (unwrapped) => {
        return new AWSRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new AWSResponse(unwrapped);
    },
};
