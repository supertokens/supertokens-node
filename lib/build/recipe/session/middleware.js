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
const utils_1 = require("../../utils");
const api_1 = require("./api");
function verifySession(recipeInstance, antiCsrfCheck) {
    // We know this should be Request but then Type
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                let method = utils_1.normaliseHttpMethod(request.method);
                if (method === "options" || method === "trace") {
                    return next();
                }
                let incomingPath = utils_1.normaliseURLPathOrThrowError(
                    recipeInstance.getRecipeId(),
                    request.originalUrl
                );
                let refreshTokenPath = recipeInstance.config.refreshTokenPath;
                if (incomingPath === refreshTokenPath && method === "post") {
                    return api_1.handleRefreshAPI(recipeInstance, request, response, next);
                } else {
                    if (antiCsrfCheck === undefined) {
                        antiCsrfCheck = method !== "get";
                    }
                    request.session = yield recipeInstance.getSession(request, response, antiCsrfCheck);
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.verifySession = verifySession;
function sendTryRefreshTokenResponse(recipeInstance, message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
function sendUnauthorisedResponse(recipeInstance, message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, userId, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield recipeInstance.revokeSession(sessionHandle);
            sendResponse(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
exports.sendTokenTheftDetectedResponse = sendTokenTheftDetectedResponse;
function sendResponse(response, message, statusCode) {
    if (!response.writableEnded) {
        response.statusCode = statusCode;
        response.json({
            message,
        });
    }
}
//# sourceMappingURL=middleware.js.map
