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
const handshakeInfo_1 = require("./handshakeInfo");
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
        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
        let refreshTokenPath = handShakeInfo.refreshTokenPath;
        let refreshTokenPathConfig = cookieAndHeaders_1.CookieConfig.getInstance().refreshTokenPath;
        if (refreshTokenPathConfig !== undefined) {
            refreshTokenPath = refreshTokenPathConfig;
        }
        return refreshTokenPath;
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
        if (error_1.AuthError.isErrorFromAuth(err)) {
            if (err.errType === error_1.AuthError.UNAUTHORISED) {
                if (options !== undefined && options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.err, request, response, next);
                } else {
                    sendUnauthorisedResponse(err.err, request, response, next);
                }
            } else if (err.errType === error_1.AuthError.TRY_REFRESH_TOKEN) {
                if (options !== undefined && options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.err, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(err.err, request, response, next);
                }
            } else if (err.errType === error_1.AuthError.TOKEN_THEFT_DETECTED) {
                if (options !== undefined && options.onTokenTheftDetected !== undefined) {
                    options.onTokenTheftDetected(err.err.sessionHandle, err.err.userId, request, response, next);
                } else {
                    sendTokenTheftDetectedResponse(err.err.sessionHandle, err.err.userId, request, response, next);
                }
            } else {
                next(err.err);
            }
        } else {
            next(err);
        }
    };
}
exports.errorHandler = errorHandler;
function sendTryRefreshTokenResponse(err, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let handshakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            sendResponse(response, "try refresh token", handshakeInfo.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
function sendUnauthorisedResponse(err, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let handshakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            sendResponse(response, "unauthorised", handshakeInfo.sessionExpiredStatusCode);
        } catch (err) {
            next(err);
        }
    });
}
function sendTokenTheftDetectedResponse(sessionHandle, userId, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let handshakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            yield express_1.revokeSession(sessionHandle);
            sendResponse(response, "token theft detected", handshakeInfo.sessionExpiredStatusCode);
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
