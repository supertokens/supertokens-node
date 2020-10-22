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
const express_1 = require("./express");
const error_1 = require("./error");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const session_1 = require("./session");
function autoRefreshMiddleware() {
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                let path = request.originalUrl.split("?")[0];
                let refreshTokenPath = yield getRefreshPath();
                if (
                    (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                    request.method.toLowerCase() === "post"
                ) {
                    yield express_1.refreshSession(request, response);
                    return response.send(JSON.stringify({}));
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.autoRefreshMiddleware = autoRefreshMiddleware;
function getRefreshPath() {
    return __awaiter(this, void 0, void 0, function* () {
        return cookieAndHeaders_1.CookieConfig.getInstanceOrThrowError().refreshTokenPath;
    });
}
function middleware(antiCsrfCheck) {
    // We know this should be Request but then Type
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                if (request.method.toLowerCase() === "options" || request.method.toLowerCase() === "trace") {
                    return next();
                }
                let path = request.originalUrl.split("?")[0];
                let refreshTokenPath = yield getRefreshPath();
                if (
                    (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                    request.method.toLowerCase() === "post"
                ) {
                    request.session = yield express_1.refreshSession(request, response);
                } else {
                    if (antiCsrfCheck === undefined) {
                        antiCsrfCheck = request.method.toLowerCase() !== "get";
                    }
                    request.session = yield express_1.getSession(request, response, antiCsrfCheck);
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.middleware = middleware;
function errorHandler(options) {
    return (err, request, response, next) => {
        if (error_1.default.isErrorFromSession(err)) {
            if (err.type === error_1.default.UNAUTHORISED) {
                if (options !== undefined && options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.message, request, response, next);
                } else {
                    sendUnauthorisedResponse(err.message, request, response, next);
                }
            } else if (err.type === error_1.default.TRY_REFRESH_TOKEN) {
                if (options !== undefined && options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.message, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(err.message, request, response, next);
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
function sendTryRefreshTokenResponse(message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(
                response,
                "try refresh token",
                session_1.SessionConfig.getInstanceOrThrowError().sessionExpiredStatusCode
            );
        } catch (err) {
            next(err);
        }
    });
}
function sendUnauthorisedResponse(message, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            sendResponse(
                response,
                "unauthorised",
                session_1.SessionConfig.getInstanceOrThrowError().sessionExpiredStatusCode
            );
        } catch (err) {
            next(err);
        }
    });
}
function sendTokenTheftDetectedResponse(sessionHandle, userId, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield express_1.revokeSession(sessionHandle);
            sendResponse(
                response,
                "token theft detected",
                session_1.SessionConfig.getInstanceOrThrowError().sessionExpiredStatusCode
            );
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
