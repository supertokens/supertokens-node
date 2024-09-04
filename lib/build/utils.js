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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBuffer = exports.decodeBase64 = exports.encodeBase64 = exports.isTestEnv = exports.getBuffer = exports.getProcess = exports.normaliseEmail = exports.postWithFetch = exports.getFromObjectCaseInsensitive = exports.getTopLevelDomainForSameSiteResolution = exports.setRequestInUserContextIfNotDefined = exports.getUserContext = exports.makeDefaultUserContextFromAPI = exports.humaniseMilliseconds = exports.frontendHasInterceptor = exports.getRidFromHeader = exports.hasGreaterThanEqualToFDI = exports.getLatestFDIVersionFromFDIList = exports.getBackwardsCompatibleUserInfo = exports.isAnIpAddress = exports.send200Response = exports.sendNon200Response = exports.sendNon200ResponseWithMessage = exports.normaliseHttpMethod = exports.normaliseInputAppInfoOrThrowError = exports.maxVersion = exports.getLargestVersionFromIntersection = exports.doFetch = void 0;
const psl = __importStar(require("psl"));
const normalisedURLDomain_1 = __importDefault(require("./normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const logger_1 = require("./logger");
const constants_1 = require("./constants");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const processState_1 = require("./processState");
const doFetch = async (input, init) => {
    // frameworks like nextJS cache fetch GET requests (https://nextjs.org/docs/app/building-your-application/caching#data-cache)
    // we don't want that because it may lead to weird behaviour when querying the core.
    if (init === undefined) {
        processState_1.ProcessState.getInstance().addState(
            processState_1.PROCESS_STATE.ADDING_NO_CACHE_HEADER_IN_FETCH
        );
        init = {
            cache: "no-cache",
        };
    } else {
        if (init.cache === undefined) {
            processState_1.ProcessState.getInstance().addState(
                processState_1.PROCESS_STATE.ADDING_NO_CACHE_HEADER_IN_FETCH
            );
            init.cache = "no-cache";
        }
    }
    const fetchFunction = typeof fetch !== "undefined" ? fetch : cross_fetch_1.default;
    try {
        return await fetchFunction(input, init);
    } catch (e) {
        // Cloudflare Workers don't support the 'cache' field in RequestInit.
        // To work around this, we delete the 'cache' field and retry the fetch if the error is due to the missing 'cache' field.
        // Remove this workaround once the 'cache' field is supported.
        // More info: https://github.com/cloudflare/workerd/issues/698
        const unimplementedCacheError =
            e &&
            typeof e === "object" &&
            "message" in e &&
            e.message === "The 'cache' field on 'RequestInitializerDict' is not implemented.";
        if (!unimplementedCacheError) throw e;
        const newOpts = Object.assign({}, init);
        delete newOpts.cache;
        return await fetchFunction(input, newOpts);
    }
};
exports.doFetch = doFetch;
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
    let apiGatewayPath =
        appInfo.apiGatewayPath !== undefined
            ? new normalisedURLPath_1.default(appInfo.apiGatewayPath)
            : new normalisedURLPath_1.default("");
    if (appInfo.origin === undefined && appInfo.websiteDomain === undefined) {
        throw new Error(
            "Please provide either origin or websiteDomain inside the appInfo object when calling supertokens.init"
        );
    }
    let websiteDomainFunction = (input) => {
        let origin = appInfo.origin;
        if (origin === undefined) {
            origin = appInfo.websiteDomain;
        }
        // This should not be possible because we check for either origin or websiteDomain above
        if (origin === undefined) {
            throw new Error("Should never come here");
        }
        if (typeof origin === "function") {
            origin = origin(input);
        }
        return new normalisedURLDomain_1.default(origin);
    };
    const apiDomain = new normalisedURLDomain_1.default(appInfo.apiDomain);
    const topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(apiDomain.getAsStringDangerous());
    const topLevelWebsiteDomain = (input) => {
        return getTopLevelDomainForSameSiteResolution(websiteDomainFunction(input).getAsStringDangerous());
    };
    return {
        appName: appInfo.appName,
        getOrigin: websiteDomainFunction,
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
        getTopLevelWebsiteDomain: topLevelWebsiteDomain,
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
    responseJson = deepTransform(responseJson);
    res.setStatusCode(200);
    res.sendJSONResponse(responseJson);
}
exports.send200Response = send200Response;
// this function tries to convert the json response based on the toJson function
// defined in the objects in the input. This is primarily used to convert the RecipeUserId
// type to a string type before sending it to the client.
function deepTransform(obj) {
    let out = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        let val = obj[key];
        if (val && typeof val === "object" && val["toJson"] !== undefined && typeof val["toJson"] === "function") {
            out[key] = val.toJson();
        } else if (val && typeof val === "object") {
            out[key] = deepTransform(val);
        } else {
            out[key] = val;
        }
    }
    return out;
}
function isAnIpAddress(ipaddress) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}
exports.isAnIpAddress = isAnIpAddress;
function getBackwardsCompatibleUserInfo(req, result, userContext) {
    let resp;
    // (>= 1.18 && < 2.0) || >= 3.0: This is because before 1.18, and between 2 and 3, FDI does not
    // support account linking.
    if (
        (hasGreaterThanEqualToFDI(req, "1.18") && !hasGreaterThanEqualToFDI(req, "2.0")) ||
        hasGreaterThanEqualToFDI(req, "3.0")
    ) {
        resp = {
            user: result.user.toJson(),
        };
        if (result.createdNewRecipeUser !== undefined) {
            resp.createdNewRecipeUser = result.createdNewRecipeUser;
        }
        return resp;
    } else {
        let loginMethod = result.user.loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === result.session.getRecipeUserId(userContext).getAsString()
        );
        if (loginMethod === undefined) {
            // we pick the oldest login method here for the user.
            // this can happen in case the user is implementing something like
            // MFA where the session remains the same during the second factor as well.
            for (let i = 0; i < result.user.loginMethods.length; i++) {
                if (loginMethod === undefined) {
                    loginMethod = result.user.loginMethods[i];
                } else if (loginMethod.timeJoined > result.user.loginMethods[i].timeJoined) {
                    loginMethod = result.user.loginMethods[i];
                }
            }
        }
        if (loginMethod === undefined) {
            throw new Error("This should never happen - user has no login methods");
        }
        const userObj = {
            id: result.user.id,
            timeJoined: loginMethod.timeJoined,
        };
        if (loginMethod.thirdParty) {
            userObj.thirdParty = loginMethod.thirdParty;
        }
        if (loginMethod.email) {
            userObj.email = loginMethod.email;
        }
        if (loginMethod.phoneNumber) {
            userObj.phoneNumber = loginMethod.phoneNumber;
        }
        resp = {
            user: userObj,
        };
        if (result.createdNewRecipeUser !== undefined) {
            resp.createdNewUser = result.createdNewRecipeUser;
        }
    }
    return resp;
}
exports.getBackwardsCompatibleUserInfo = getBackwardsCompatibleUserInfo;
function getLatestFDIVersionFromFDIList(fdiHeaderValue) {
    let versions = fdiHeaderValue.split(",");
    let maxVersionStr = versions[0];
    for (let i = 1; i < versions.length; i++) {
        maxVersionStr = maxVersion(maxVersionStr, versions[i]);
    }
    return maxVersionStr;
}
exports.getLatestFDIVersionFromFDIList = getLatestFDIVersionFromFDIList;
function hasGreaterThanEqualToFDI(req, version) {
    let requestFDI = req.getHeaderValue(constants_1.HEADER_FDI);
    if (requestFDI === undefined) {
        // By default we assume they want to use the latest FDI, this also helps with tests
        return true;
    }
    requestFDI = getLatestFDIVersionFromFDIList(requestFDI);
    if (requestFDI === version || maxVersion(version, requestFDI) !== version) {
        return true;
    }
    return false;
}
exports.hasGreaterThanEqualToFDI = hasGreaterThanEqualToFDI;
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
function getUserContext(inputUserContext) {
    return inputUserContext !== null && inputUserContext !== void 0 ? inputUserContext : {};
}
exports.getUserContext = getUserContext;
function setRequestInUserContextIfNotDefined(userContext, request) {
    if (userContext === undefined) {
        userContext = {};
    }
    if (userContext._default === undefined) {
        userContext._default = {};
    }
    if (typeof userContext._default === "object") {
        userContext._default.request = request;
        userContext._default.keepCacheAlive = true;
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
        if (hostname.endsWith(".amazonaws.com") && parsedURL.tld === hostname) {
            return hostname;
        }
        // support for .local domain
        if (hostname.endsWith(".local") && parsedURL.tld === null) {
            return hostname;
        }
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
async function postWithFetch(url, headers, body, { successLog, errorLogHeader }) {
    let error;
    let resp;
    try {
        const fetchResp = await exports.doFetch(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers,
        });
        const respText = await fetchResp.text();
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
}
exports.postWithFetch = postWithFetch;
function normaliseEmail(email) {
    email = email.trim();
    email = email.toLowerCase();
    return email;
}
exports.normaliseEmail = normaliseEmail;
const getProcess = () => {
    /**
     * Return the process instance if it is available falling back
     * to one that is compatible where process may not be available
     * (like `edge` runtime).
     */
    if (typeof process !== "undefined") return process;
    const ponyFilledProcess = require("process");
    return ponyFilledProcess;
};
exports.getProcess = getProcess;
const getBuffer = () => {
    /**
     * Return the Buffer instance if it is available falling back
     * to one that is compatible where it may not be available
     * (like `edge` runtime).
     */
    if (typeof Buffer !== "undefined") return Buffer;
    const ponyFilledBuffer = require("buffer").Buffer;
    return ponyFilledBuffer;
};
exports.getBuffer = getBuffer;
const isTestEnv = () => {
    /**
     * Check if test mode is enabled by reading the environment variable.
     */
    return exports.getProcess().env.TEST_MODE === "testing";
};
exports.isTestEnv = isTestEnv;
const encodeBase64 = (value) => {
    /**
     * Encode the passed value to base64 and return the encoded value.
     */
    return exports.getBuffer().from(value).toString("base64");
};
exports.encodeBase64 = encodeBase64;
const decodeBase64 = (value) => {
    /**
     * Decode the passed value with base64 encoded and return the
     * decoded value.
     */
    return exports.getBuffer().from(value, "base64").toString();
};
exports.decodeBase64 = decodeBase64;
const isBuffer = (obj) => {
    /**
     * Check if the passed object is a buffer or not.
     */
    return exports.getBuffer().isBuffer(obj);
};
exports.isBuffer = isBuffer;
