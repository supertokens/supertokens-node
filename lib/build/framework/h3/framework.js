"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const h3_1 = require("h3");
const supertokens_1 = require("../../supertokens");
const utils_1 = require("../../utils");
const request_1 = require("../request");
const response_1 = require("../response");
const utils_2 = require("../utils");
class H3Request extends request_1.BaseRequest {
    constructor(request) {
        super();
        this.getCookieValue = (key) => {
            return utils_2.getCookieValueFromIncomingMessage(this.request, key);
        };
        this.getFormData = () => __awaiter(this, void 0, void 0, function* () {
            return utils_2.useRawBody(this.request);
        });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(this.request.method);
        };
        this.getHeaderValue = (key) => {
            return utils_2.getHeaderValueFromIncomingMessage(this.request, key);
        };
        this.getOriginalURL = () => {
            return this.request.url;
        };
        this.getKeyValueFromQuery = (key) => {
            let path = this.request.url || "/";
            const queryIndex = path.lastIndexOf('?');
            if (queryIndex > -1) {
                const queryArray = path.substring(queryIndex + 1, path.length).split('&');
                const index = queryArray.findIndex(el => el.includes(key));
                if (index === -1)
                    return undefined;
                const value = queryArray[index].split('=')[1];
                if (value === undefined || typeof value !== 'string') {
                    return undefined;
                }
                return value;
            }
            else {
                return undefined;
            }
        };
        this.getJSONBody = () => __awaiter(this, void 0, void 0, function* () {
            return yield utils_2.useBody(this.request);
        });
        this.original = request;
        this.request = request;
    }
    ;
}
exports.H3Request = H3Request;
class H3ResponseTokens extends response_1.BaseResponse {
    constructor(response) {
        super();
        this.sendHTMLResponse = (html) => {
            if (this.response.writable) {
                this.response.setHeader('Content-Type', 'text/html');
                this.response.statusCode = this.statusCode;
                this.response.end(html);
            }
        };
        this.setHeader = (key, value, allowDuplicateKey) => {
            try {
                const allheaders = this.response.getHeaders();
                let existingValue = allheaders[key];
                // we have the this.response.header for compatibility with nextJS
                if (existingValue === undefined) {
                    this.response.setHeader(key, value);
                }
                else if (allowDuplicateKey) {
                    this.response.setHeader(key, existingValue + ", " + value);
                }
                else {
                    // we overwrite the current one with the new one
                    this.response.setHeader(key, value);
                }
            }
            catch (err) {
                throw new Error("Error while setting header with key: " + key + " and value: " + value);
            }
        };
        this.setCookie = (key, value, domain, secure, httpOnly, expires, path, sameSite) => {
            utils_2.setCookieForServerResponse(this.response, key, value, domain, secure, httpOnly, expires, path, sameSite);
        };
        this.setStatusCode = (statusCode) => {
            if (this.response.writable) {
                this.statusCode = statusCode;
            }
        };
        this.sendJSONResponse = (content) => {
            if (this.response.writable) {
                content = JSON.stringify(content);
                this.response.setHeader('Content-Type', 'application/json');
                this.response.statusCode = this.statusCode;
                this.response.end(content, 'utf-8');
            }
        };
        this.original = response;
        this.response = response;
        this.statusCode = 200;
    }
}
exports.H3ResponseTokens = H3ResponseTokens;
exports.middlware = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        let supertokens;
        const request = new H3Request(req);
        const response = new H3ResponseTokens(res);
        try {
            supertokens = supertokens_1.default.getInstanceOrThrowError();
            const result = yield supertokens.middleware(request, response);
            if (!result) {
                return next();
            }
        }
        catch (err) {
            if (supertokens) {
                try {
                    yield supertokens.errorHandler(err, request, response);
                }
                catch (_a) {
                    next(err);
                }
            }
            else {
                next(err);
            }
        }
    });
};
exports.errorHandler = () => {
    return (event, errorPlain, statusCode) => __awaiter(void 0, void 0, void 0, function* () {
        const error = h3_1.createError(errorPlain);
        error.statusCode = statusCode;
        h3_1.sendError(event, error);
    });
};
exports.H3Wrapper = {
    middlware: exports.middlware,
    errorHandler: exports.errorHandler,
    wrapRequest: (unwrapped) => {
        return new H3Request(unwrapped.req);
    },
    wrapResponse: (unwrapped) => {
        return new H3ResponseTokens(unwrapped.res);
    }
};
