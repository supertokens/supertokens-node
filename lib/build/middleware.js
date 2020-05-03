"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("./express");
const error_1 = require("./error");
const handshakeInfo_1 = require("./handshakeInfo");
// TODO: How will the user get access to this?
function middleware(antiCsrfCheck) {
    // TODO: the input request type will be Request only right? The out will have SessionRequest type?
    // We know this should be Request but then Type
    return (request, response, next) => __awaiter(this, void 0, void 0, function* () {
        // TODO: For OPTIONS API, we must only call next() and then return. Is there any other HTTP Method like that?
        if (request.method.toLowerCase() === "options") {
            return next();
        }
        let path = request.originalUrl.split("?")[0];
        if (antiCsrfCheck === undefined) {
            antiCsrfCheck = request.method.toLowerCase() !== "get";
        }
        let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
        // TODO: handShakeInfo.refreshTokenPath may or may not have a trailing /
        // TODO: path may or may not have a trailing /
        // TODO: modify if statement based on the two point above.
        // TODO: Discuss: Any reason to not use async / await?
        try {
            if (handShakeInfo.refreshTokenPath === path
                ||
                    `${handShakeInfo.refreshTokenPath}/` === path
                ||
                    handShakeInfo.refreshTokenPath === `${path}/`) {
                request.session = yield express_1.refreshSession(request, response);
                return next();
            }
            request.session = yield express_1.getSession(request, response, antiCsrfCheck);
            return next();
        }
        catch (err) {
            return next(err);
        }
        // TODO: This will changed based on our last discussion.
    });
}
exports.middleware = middleware;
function errorHandler(options) {
    return (err, request, response, next) => {
        if (error_1.AuthError.isErrorFromAuth(err)) {
            if (err.errType === error_1.AuthError.UNAUTHORISED) {
                if (options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.err, request, response, next);
                }
                else {
                    sendUnauthorisedResponse(err.err, request, response, next);
                }
            }
            else if (err.errType === error_1.AuthError.TRY_REFRESH_TOKEN) {
                if (options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.err, request, response, next);
                }
                else {
                    sendTryRefreshTokenResponse(err.err, request, response, next);
                }
            }
            else if (err.errType === error_1.AuthError.TOKEN_THEFT_DETECTED) {
                if (options.onTokenTheftDetected !== undefined) {
                    options.onTokenTheftDetected(err.err.sessionHandle, err.err.userId, request, response, next);
                }
                else {
                    sendTokenTheftDetectedResponse(err.err.sessionHandle, err.err.userId, request, response, next);
                }
            }
            else {
                next(err.err);
            }
        }
        else {
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
        }
        catch (err) {
            next(err);
        }
    });
}
function sendUnauthorisedResponse(err, request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let handshakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            sendResponse(response, "unauthorised", handshakeInfo.sessionExpiredStatusCode);
        }
        catch (err) {
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
        }
        catch (err) {
            next(err);
        }
    });
}
function sendResponse(response, message, statusCode) {
    if (!response.finished) {
        response.statusCode = statusCode;
        response.json({
            message
        });
    }
}
//# sourceMappingURL=middleware.js.map