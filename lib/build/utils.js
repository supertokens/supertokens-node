"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const error_1 = require("./error");
const constants_1 = require("./constants");
function normaliseURLPathOrThrowError(rId, input) {
    input = input.trim().toLowerCase();
    try {
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new url_1.URL(input);
        input = urlObj.pathname;
        if (input.charAt(input.length - 1) === "/") {
            return input.substr(0, input.length - 1);
        }
        return input;
    } catch (err) {}
    // not a valid URL
    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name + path
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        input = "http://" + input;
        return normaliseURLPathOrThrowError(rId, input);
    }
    if (input.charAt(0) !== "/") {
        input = "/" + input;
    }
    // at this point, we should be able to convert it into a fake URL and recursively call this function.
    try {
        // test that we can convert this to prevent an infinite loop
        new url_1.URL("http://example.com" + input);
        return normaliseURLPathOrThrowError(rId, "http://example.com" + input);
    } catch (err) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            rId,
            payload: new Error("Please provide a valid URL path"),
        });
    }
}
exports.normaliseURLPathOrThrowError = normaliseURLPathOrThrowError;
function normaliseURLDomainOrThrowError(rId, input) {
    function isAnIpAddress(ipaddress) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            ipaddress
        );
    }
    input = input.trim().toLowerCase();
    try {
        if (!input.startsWith("http://") && !input.startsWith("https://") && !input.startsWith("supertokens://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new url_1.URL(input);
        if (urlObj.protocol === "supertokens:") {
            if (urlObj.hostname.startsWith("localhost") || isAnIpAddress(urlObj.hostname)) {
                input = "http://" + urlObj.host;
            } else {
                input = "https://" + urlObj.host;
            }
        } else {
            input = urlObj.protocol + "//" + urlObj.host;
        }
        return input;
    } catch (err) {}
    // not a valid URL
    if (input.indexOf(".") === 0) {
        input = input.substr(1);
    }
    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        // The supertokens:// signifies to the recursive call that the call was made by us.
        input = "supertokens://" + input;
        // at this point, it should be a valid URL. So we test that before doing a recursive call
        try {
            new url_1.URL(input);
            return normaliseURLDomainOrThrowError(rId, input);
        } catch (err) {}
    }
    throw new error_1.default({
        type: error_1.default.GENERAL_ERROR,
        rId,
        payload: new Error("Please provide a valid domain name"),
    });
}
exports.normaliseURLDomainOrThrowError = normaliseURLDomainOrThrowError;
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
function normaliseInputAppInfoOrThrowError(rId, appInfo) {
    return {
        appName: appInfo.appName,
        websiteDomain: normaliseURLDomainOrThrowError(rId, appInfo.websiteDomain),
        apiDomain: normaliseURLDomainOrThrowError(rId, appInfo.apiDomain),
        apiBasePath:
            appInfo.apiBasePath === undefined
                ? normaliseURLPathOrThrowError(rId, "/auth")
                : normaliseURLPathOrThrowError(rId, appInfo.apiBasePath),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? normaliseURLPathOrThrowError(rId, "/auth")
                : normaliseURLPathOrThrowError(rId, appInfo.websiteBasePath),
    };
}
exports.normaliseInputAppInfoOrThrowError = normaliseInputAppInfoOrThrowError;
function getRIDFromRequest(req) {
    return getHeader(req, constants_1.HEADER_RID);
}
exports.getRIDFromRequest = getRIDFromRequest;
function normaliseHttpMethod(method) {
    return method.toLowerCase();
}
exports.normaliseHttpMethod = normaliseHttpMethod;
function getHeader(req, key) {
    let value = req.headers[key];
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
exports.getHeader = getHeader;
//# sourceMappingURL=utils.js.map
