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
const utils_1 = require("../../utils");
const api_1 = require("./api");
function middleware(recipeInstance, antiCsrfCheck) {
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
exports.middleware = middleware;
function errorHandler(recipeInstance, options) {
    return (err, request, response, next) => {
        if (recipeInstance.isErrorFromThisRecipe(err)) {
            if (err.type === error_1.default.UNAUTHORISED) {
                if (options !== undefined && options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.message, request, response, next);
                } else {
                    sendUnauthorisedResponse(recipeInstance, err.message, request, response, next);
                }
            } else if (err.type === error_1.default.TRY_REFRESH_TOKEN) {
                if (options !== undefined && options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.message, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(recipeInstance, err.message, request, response, next);
                }
            } else if (err.type === error_1.default.TOKEN_THEFT_DETECTED) {
                if (options !== undefined && options.onTokenTheftDetected !== undefined) {
                    options.onTokenTheftDetected(
                        err.payload.sessionHandle,
                        err.payload.userId,
                        request,
                        response,
                        next
                    );
                } else {
                    sendTokenTheftDetectedResponse(
                        recipeInstance,
                        err.payload.sessionHandle,
                        err.payload.userId,
                        request,
                        response,
                        next
                    );
                }
            } else {
                next(err.payload);
            }
        } else {
            next(err);
        }
    };
}
exports.errorHandler = errorHandler;
function sendTryRefreshTokenResponse(recipeInstance, message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
function sendUnauthorisedResponse(recipeInstance, message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
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
function sendResponse(response, message, statusCode) {
    if (!response.finished) {
        response.statusCode = statusCode;
        response.json({
            message,
        });
    }
}
//# sourceMappingURL=middleware.js.map
