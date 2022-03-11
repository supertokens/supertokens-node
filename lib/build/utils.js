"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
const jsonschema_1 = require("jsonschema");
const debug_1 = require("debug");
const version_1 = require("./version");
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
    res.setStatusCode(statusCode);
    res.sendJSONResponse({ message });
}
exports.sendNon200Response = sendNon200Response;
function send200Response(res, responseJson) {
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
function validateTheStructureOfUserInput(config, inputSchema, configRoot) {
    // the validation package will not throw if the given schema is undefined
    // as it is requires to validate a json object
    config = config === undefined || config === null ? {} : config;
    let inputValidation = jsonschema_1.validate(config, inputSchema);
    if (inputValidation.errors.length > 0) {
        let path = inputValidation.errors[0].path.join(".");
        if (path !== "") {
            path += " ";
        }
        let errorMessage = `${path}${inputValidation.errors[0].message}`;
        if (errorMessage.startsWith("requires") || errorMessage.startsWith("is not allowed")) {
            errorMessage = `input config ${errorMessage}`;
        }
        if (errorMessage.includes("is not allowed to have the additional property")) {
            errorMessage = `${errorMessage}. Did you mean to set this on the frontend side?`;
        }
        errorMessage = `Config schema error in ${configRoot}: ${errorMessage}`;
        throw new Error(errorMessage);
    }
}
exports.validateTheStructureOfUserInput = validateTheStructureOfUserInput;
function frontendHasInterceptor(req) {
    return getRIDFromRequest(req) !== undefined;
}
exports.frontendHasInterceptor = frontendHasInterceptor;
/*
 The error logger and info logger defined below use the debug lib to log error and info messages when the DEBUG env is set with the com.supertokens namespace.
For example:
    errLoggerWithCode[1]("Test")
    infoLogger("some info")

Output: (with DEBUG=com.supertokens:*)
  com.supertokens:error {t: "2022-03-09T10:47:57.379Z", errCode: 1, msg: "Example error with custom str Test", sdkVer: "9.0.0"} +0ms
  com.supertokens:info {t: "2022-03-09T10:47:57.380Z", msg: "Some info", sdkVer: "9.0.0"} +0ms

*/
const ERROR_CODE_1 = 1;
exports.ERROR_CODE_1 = ERROR_CODE_1;
const ERROR_CODE_2 = 2;
exports.ERROR_CODE_2 = ERROR_CODE_2;
let errLoggerHelper = (errorCode, message) => {
    debug_1.default(`${constants_1.SUPERTOKENS_NAMESPACE}${constants_1.ERROR_ID}`)(
        `{t: "${new Date().toISOString()}", errCode: ${errorCode}, msg: "${message}", sdkVer: "${version_1.version}"}`
    );
};
function infoLogger(message) {
    debug_1.default(`${constants_1.SUPERTOKENS_NAMESPACE}${constants_1.INFO_ID}`)(
        `{t: "${new Date().toISOString()}", msg: "${message}"}`
    );
}
exports.infoLogger = infoLogger;
exports.errorLoggerWithCode = {
    1: (item) => {
        errLoggerHelper(ERROR_CODE_1, "Example error with param: " + item);
    },
    2: () => {
        errLoggerHelper(ERROR_CODE_2, '"Example error"');
    },
};
