"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseEmail = exports.postWithFetch = exports.getFromObjectCaseInsensitive = exports.getTopLevelDomainForSameSiteResolution = exports.setRequestInUserContextIfNotDefined = exports.makeDefaultUserContextFromAPI = exports.humaniseMilliseconds = exports.frontendHasInterceptor = exports.getRidFromHeader = exports.isAnIpAddress = exports.send200Response = exports.sendNon200Response = exports.sendNon200ResponseWithMessage = exports.normaliseHttpMethod = exports.normaliseInputAppInfoOrThrowError = exports.maxVersion = exports.getLargestVersionFromIntersection = void 0;
const psl = __importStar(require("psl"));
const normalisedURLDomain_1 = __importDefault(require("./normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const logger_1 = require("./logger");
const constants_1 = require("./constants");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
function getLargestVersionFromIntersection(v1, v2) {
    let intersection = v1.filter((value) => v2.indexOf(value) !== -1);
    if (intersection.length === 0) {
        return undefined;
    }
    let maxVersionSoFar = intersection[0];
    for (let i = 1; i < intersection.length; i++) {
        maxVersionSoFar = maxVersion(intersection[i], maxVersionSoFar);
    }
    return maxVersionSoFar;
}
exports.getLargestVersionFromIntersection = getLargestVersionFromIntersection;
function maxVersion(version1, version2) {
    let splittedv1 = version1.split(".");
    let splittedv2 = version2.split(".");
    let minLength = Math.min(splittedv1.length, splittedv2.length);
    for (let i = 0; i < minLength; i++) {
        let v1 = Number(splittedv1[i]);
        let v2 = Number(splittedv2[i]);
        if (v1 > v2) {
            return version1;
        } else if (v2 > v1) {
            return version2;
        }
    }
    if (splittedv1.length >= splittedv2.length) {
        return version1;
    }
    return version2;
}
exports.maxVersion = maxVersion;
function normaliseInputAppInfoOrThrowError(appInfo) {
    if (appInfo === undefined) {
        throw new Error("Please provide the appInfo object when calling supertokens.init");
    }
    if (appInfo.apiDomain === undefined) {
        throw new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.appName === undefined) {
        throw new Error("Please provide your appName inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.websiteDomain === undefined) {
        throw new Error("Please provide your websiteDomain inside the appInfo object when calling supertokens.init");
    }
    let apiGatewayPath =
        appInfo.apiGatewayPath !== undefined
            ? new normalisedURLPath_1.default(appInfo.apiGatewayPath)
            : new normalisedURLPath_1.default("");
    const websiteDomain = new normalisedURLDomain_1.default(appInfo.websiteDomain);
    const apiDomain = new normalisedURLDomain_1.default(appInfo.apiDomain);
    const topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(apiDomain.getAsStringDangerous());
    const topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(websiteDomain.getAsStringDangerous());
    return {
        appName: appInfo.appName,
        websiteDomain,
        apiDomain,
        apiBasePath: apiGatewayPath.appendPath(
            appInfo.apiBasePath === undefined
                ? new normalisedURLPath_1.default("/auth")
                : new normalisedURLPath_1.default(appInfo.apiBasePath)
        ),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? new normalisedURLPath_1.default("/auth")
                : new normalisedURLPath_1.default(appInfo.websiteBasePath),
        apiGatewayPath,
        topLevelAPIDomain,
        topLevelWebsiteDomain,
    };
}
exports.normaliseInputAppInfoOrThrowError = normaliseInputAppInfoOrThrowError;
function normaliseHttpMethod(method) {
    return method.toLowerCase();
}
exports.normaliseHttpMethod = normaliseHttpMethod;
function sendNon200ResponseWithMessage(res, message, statusCode) {
    sendNon200Response(res, statusCode, { message });
}
exports.sendNon200ResponseWithMessage = sendNon200ResponseWithMessage;
function sendNon200Response(res, statusCode, body) {
    if (statusCode < 300) {
        throw new Error("Calling sendNon200Response with status code < 300");
    }
    logger_1.logDebugMessage("Sending response to client with status code: " + statusCode);
    res.setStatusCode(statusCode);
    res.sendJSONResponse(body);
}
exports.sendNon200Response = sendNon200Response;
function send200Response(res, responseJson) {
    logger_1.logDebugMessage("Sending response to client with status code: 200");
    res.setStatusCode(200);
    res.sendJSONResponse(responseJson);
}
exports.send200Response = send200Response;
function isAnIpAddress(ipaddress) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}
exports.isAnIpAddress = isAnIpAddress;
function getRidFromHeader(req) {
    return req.getHeaderValue(constants_1.HEADER_RID);
}
exports.getRidFromHeader = getRidFromHeader;
function frontendHasInterceptor(req) {
    return getRidFromHeader(req) !== undefined;
}
exports.frontendHasInterceptor = frontendHasInterceptor;
function humaniseMilliseconds(ms) {
    let t = Math.floor(ms / 1000);
    let suffix = "";
    if (t < 60) {
        if (t > 1) suffix = "s";
        return `${t} second${suffix}`;
    } else if (t < 3600) {
        const m = Math.floor(t / 60);
        if (m > 1) suffix = "s";
        return `${m} minute${suffix}`;
    } else {
        const h = Math.floor(t / 360) / 10;
        if (h > 1) suffix = "s";
        return `${h} hour${suffix}`;
    }
}
exports.humaniseMilliseconds = humaniseMilliseconds;
function makeDefaultUserContextFromAPI(request) {
    return setRequestInUserContextIfNotDefined({}, request);
}
exports.makeDefaultUserContextFromAPI = makeDefaultUserContextFromAPI;
function setRequestInUserContextIfNotDefined(userContext, request) {
    if (userContext === undefined) {
        userContext = {};
    }
    if (userContext._default === undefined) {
        userContext._default = {};
    }
    if (typeof userContext._default === "object") {
        userContext._default.request = request;
    }
    return userContext;
}
exports.setRequestInUserContextIfNotDefined = setRequestInUserContextIfNotDefined;
function getTopLevelDomainForSameSiteResolution(url) {
    let urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || hostname.startsWith("localhost.org") || isAnIpAddress(hostname)) {
        // we treat these as the same TLDs since we can use sameSite lax for all of them.
        return "localhost";
    }
    let parsedURL = psl.parse(hostname);
    if (parsedURL.domain === null) {
        throw new Error("Please make sure that the apiDomain and websiteDomain have correct values");
    }
    return parsedURL.domain;
}
exports.getTopLevelDomainForSameSiteResolution = getTopLevelDomainForSameSiteResolution;
function getFromObjectCaseInsensitive(key, object) {
    const matchedKeys = Object.keys(object).filter((i) => i.toLocaleLowerCase() === key.toLocaleLowerCase());
    if (matchedKeys.length === 0) {
        return undefined;
    }
    return object[matchedKeys[0]];
}
exports.getFromObjectCaseInsensitive = getFromObjectCaseInsensitive;
function postWithFetch(url, headers, body, { successLog, errorLogHeader }) {
    return __awaiter(this, void 0, void 0, function* () {
        let error;
        let resp;
        try {
            const fetchResp = yield cross_fetch_1.default(url, {
                method: "POST",
                body: JSON.stringify(body),
                headers,
            });
            const respText = yield fetchResp.text();
            resp = {
                status: fetchResp.status,
                body: JSON.parse(respText),
            };
            if (fetchResp.status < 300) {
                logger_1.logDebugMessage(successLog);
                return { resp };
            }
            logger_1.logDebugMessage(errorLogHeader);
            logger_1.logDebugMessage(`Error status: ${fetchResp.status}`);
            logger_1.logDebugMessage(`Error response: ${respText}`);
        } catch (caught) {
            error = caught;
            logger_1.logDebugMessage(errorLogHeader);
            if (error instanceof Error) {
                logger_1.logDebugMessage(`Error: ${error.message}`);
            } else {
                logger_1.logDebugMessage(`Error: ${JSON.stringify(error)}`);
            }
        }
        logger_1.logDebugMessage("Logging the input below:");
        logger_1.logDebugMessage(JSON.stringify(body, null, 2));
        if (error !== undefined) {
            return {
                error,
            };
        }
        return {
            resp: resp,
        };
    });
}
exports.postWithFetch = postWithFetch;
function normaliseEmail(email) {
    email = email.trim();
    email = email.toLowerCase();
    return email;
}
exports.normaliseEmail = normaliseEmail;
