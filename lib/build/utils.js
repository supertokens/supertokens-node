"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
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
    if (appInfo === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.apiDomain === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.appName === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide your appNmae inside the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.websiteDomain === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error(
                "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
            ),
            rId: "",
        });
    }
    return {
        appName: appInfo.appName,
        websiteDomain: new normalisedURLDomain_1.default(rId, appInfo.websiteDomain),
        apiDomain: new normalisedURLDomain_1.default(rId, appInfo.apiDomain),
        apiBasePath:
            appInfo.apiBasePath === undefined
                ? new normalisedURLPath_1.default(rId, "/auth")
                : new normalisedURLPath_1.default(rId, appInfo.apiBasePath),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? new normalisedURLPath_1.default(rId, "/auth")
                : new normalisedURLPath_1.default(rId, appInfo.websiteBasePath),
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
