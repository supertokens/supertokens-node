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
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
const jsonschema_1 = require("jsonschema");
const fs_1 = require("fs");
const constants_2 = require("./recipe/session/constants");
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
function getDataFromFileForServerlessCache(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let dataFromFile = yield new Promise((resolve, reject) => {
                fs_1.readFile(filePath, (err, data) => {
                    if (err !== undefined && err !== null) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            return JSON.parse(dataFromFile.toString());
        } catch (err) {
            return undefined;
        }
    });
}
exports.getDataFromFileForServerlessCache = getDataFromFileForServerlessCache;
function storeIntoTempFolderForServerlessCache(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield new Promise((resolve, _) =>
                __awaiter(this, void 0, void 0, function* () {
                    fs_1.writeFile(filePath, JSON.stringify(data), (_) => {
                        resolve(undefined);
                    });
                })
            );
        } catch (err) {}
    });
}
exports.storeIntoTempFolderForServerlessCache = storeIntoTempFolderForServerlessCache;
function removeFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield new Promise((resolve, reject) => {
                fs_1.unlink(filePath, (err) => {
                    if (err !== undefined && err !== null) {
                        reject(err);
                    }
                    resolve(undefined);
                });
            });
        } catch (err) {}
    });
}
function removeServerlessCache() {
    return __awaiter(this, void 0, void 0, function* () {
        let tempFilesPath = [
            constants_1.SERVERLESS_CACHE_API_VERSION_FILE_PATH,
            constants_2.SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH,
        ];
        for (let i = 0; i < tempFilesPath.length; i++) {
            yield removeFile(tempFilesPath[i]);
        }
    });
}
exports.removeServerlessCache = removeServerlessCache;
function frontendHasInterceptor(req) {
    return getRIDFromRequest(req) !== undefined;
}
exports.frontendHasInterceptor = frontendHasInterceptor;
