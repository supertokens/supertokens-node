"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
const logger_1 = require("./logger");
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
    return {
        appName: appInfo.appName,
        websiteDomain: new normalisedURLDomain_1.default(appInfo.websiteDomain),
        apiDomain: new normalisedURLDomain_1.default(appInfo.apiDomain),
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
    };
}
exports.normaliseInputAppInfoOrThrowError = normaliseInputAppInfoOrThrowError;
function getRIDFromRequest(req) {
    return req.getHeaderValue(constants_1.HEADER_RID);
}
exports.getRIDFromRequest = getRIDFromRequest;
function normaliseHttpMethod(method) {
    return method.toLowerCase();
}
exports.normaliseHttpMethod = normaliseHttpMethod;
function sendNon200Response(res, message, statusCode) {
    if (statusCode < 300) {
        throw new Error("Calling sendNon200Response with status code < 300");
    }
    logger_1.logDebugMessage("Sending response to client with status code: " + statusCode);
    res.setStatusCode(statusCode);
    res.sendJSONResponse({ message });
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
function frontendHasInterceptor(req) {
    return getRIDFromRequest(req) !== undefined;
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
    return {
        _default: {
            request,
        },
    };
}
exports.makeDefaultUserContextFromAPI = makeDefaultUserContextFromAPI;
