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
const error_1 = require("./error");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
const bodyParser = require("body-parser");
const jsonschema_1 = require("jsonschema");
const error_2 = require("./error");
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
function normaliseInputAppInfoOrThrowError(recipe, appInfo) {
    if (appInfo === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide the appInfo object when calling supertokens.init"),
            recipe,
        });
    }
    if (appInfo.apiDomain === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init"),
            recipe,
        });
    }
    if (appInfo.appName === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error("Please provide your appName inside the appInfo object when calling supertokens.init"),
            recipe,
        });
    }
    if (appInfo.websiteDomain === undefined) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            payload: new Error(
                "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
            ),
            recipe,
        });
    }
    return {
        appName: appInfo.appName,
        websiteDomain: new normalisedURLDomain_1.default(recipe, appInfo.websiteDomain),
        apiDomain: new normalisedURLDomain_1.default(recipe, appInfo.apiDomain),
        apiBasePath:
            appInfo.apiBasePath === undefined
                ? new normalisedURLPath_1.default(recipe, "/auth")
                : new normalisedURLPath_1.default(recipe, appInfo.apiBasePath),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? new normalisedURLPath_1.default(recipe, "/auth")
                : new normalisedURLPath_1.default(recipe, appInfo.websiteBasePath),
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
function sendNon200Response(recipe, res, message, statusCode) {
    if (statusCode < 300) {
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            recipe,
            payload: new Error("Calling sendNon200Response with status code < 300"),
        });
    }
    if (!res.writableEnded) {
        res.statusCode = statusCode;
        res.json({
            message,
        });
    }
}
exports.sendNon200Response = sendNon200Response;
function send200Response(res, responseJson) {
    if (!res.writableEnded) {
        res.status(200).json(responseJson);
    }
}
exports.send200Response = send200Response;
function assertThatBodyParserHasBeenUsed(recipe, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // according to https://github.com/supertokens/supertokens-node/issues/33
        let method = normaliseHttpMethod(req.method);
        if (method === "post" || method === "put") {
            if (req.body === undefined) {
                let jsonParser = bodyParser.json();
                let err = yield new Promise((resolve) => jsonParser(req, res, resolve));
                if (err !== undefined) {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "API input error: Please make sure to pass a valid JSON input in thr request body",
                        recipe,
                    });
                }
            } else if (typeof req.body === "string") {
                try {
                    req.body = JSON.parse(req.body);
                } catch (err) {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "API input error: Please make sure to pass a valid JSON input in thr request body",
                        recipe,
                    });
                }
            }
        } else if (method === "delete" || method === "get") {
            if (req.query === undefined) {
                let parser = bodyParser.urlencoded({ extended: true });
                let err = yield new Promise((resolve) => parser(req, res, resolve));
                if (err !== undefined) {
                    throw new error_1.default({
                        type: error_1.default.BAD_INPUT_ERROR,
                        message: "API input error: Please make sure to pass valid URL query params",
                        recipe,
                    });
                }
            }
        }
    });
}
exports.assertThatBodyParserHasBeenUsed = assertThatBodyParserHasBeenUsed;
function isAnIpAddress(ipaddress) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}
exports.isAnIpAddress = isAnIpAddress;
function validateTheStructureOfUserInput(config, inputSchema, configRoot, recipe) {
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
        throw new error_2.default({
            recipe,
            payload: new Error(errorMessage),
            type: "GENERAL_ERROR",
        });
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
//# sourceMappingURL=utils.js.map
