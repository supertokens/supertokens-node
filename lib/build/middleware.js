"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
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
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("./express");
const error_1 = require("./error");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const handshakeInfo_1 = require("./handshakeInfo");
function sessionVerify(antiCsrfCheck) {
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function*() {
            let path = request.originalUrl.split("?")[0];
            if (antiCsrfCheck === undefined) {
                antiCsrfCheck = request.method.toLowerCase() !== "get";
            }
            let handShakeInfo = yield handshakeInfo_1.HandshakeInfo.getInstance();
            if (handShakeInfo.refreshTokenPath === path) {
                next();
            } else {
                express_1
                    .getSession(request, response, antiCsrfCheck)
                    .then(session => {
                        request.session = session;
                        next();
                    })
                    .catch(err =>
                        __awaiter(this, void 0, void 0, function*() {
                            if (
                                error_1.AuthError.isErrorFromAuth(err) &&
                                err.errType === error_1.AuthError.UNAUTHORISED
                            ) {
                                cookieAndHeaders_1.clearSessionFromCookie(
                                    response,
                                    handShakeInfo.cookieDomain,
                                    handShakeInfo.cookieSecure,
                                    handShakeInfo.accessTokenPath,
                                    handShakeInfo.refreshTokenPath,
                                    handShakeInfo.idRefreshTokenPath,
                                    handShakeInfo.cookieSameSite
                                );
                            }
                            next(err);
                        })
                    );
            }
        });
}
exports.sessionVerify = sessionVerify;
//# sourceMappingURL=middleware.js.map
