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
const normalisedURLPath_1 = require("../../normalisedURLPath");
const error_1 = require("./error");
const cookieAndHeaders_1 = require("./cookieAndHeaders");
function verifySession(recipeInstance, options) {
    // We know this should be Request but then Type
    return (request, response, next) =>
        __awaiter(this, void 0, void 0, function* () {
            try {
                let method = utils_1.normaliseHttpMethod(request.method);
                if (method === "options" || method === "trace") {
                    return next();
                }
                let antiCsrfCheck =
                    options !== undefined
                        ? typeof options === "boolean"
                            ? options
                            : options.antiCsrfCheck
                        : undefined;
                let incomingPath = new normalisedURLPath_1.default(
                    recipeInstance,
                    request.originalUrl === undefined ? request.url : request.originalUrl
                );
                let refreshTokenPath = recipeInstance.config.refreshTokenPath;
                if (incomingPath.equals(refreshTokenPath) && method === "post") {
                    request.session = yield recipeInstance.refreshSession(request, response);
                } else {
                    try {
                        request.session = yield recipeInstance.getSession(request, response, antiCsrfCheck);
                    } catch (err) {
                        /**
                         * The condition for letting letting an anonymous
                         * session pass is (we do not of that to throw the error):
                         * - Should throw an UNAUTHORISED error
                         * - Should be that no session headers are provided in the request.
                         *   Cause if they are, it means the frontend thinks there is a session
                         *   but actually there is none. So it's better to send an UNAUTHORISED error
                         * - User has set sessionRequired to false
                         */
                        if (
                            !(
                                cookieAndHeaders_1.getIdRefreshTokenFromCookie(request) === undefined &&
                                err.type === error_1.default.UNAUTHORISED &&
                                options !== undefined &&
                                typeof options !== "boolean" &&
                                options.sessionRequired === false
                            )
                        ) {
                            throw err;
                        }
                    }
                }
                return next();
            } catch (err) {
                next(err);
            }
        });
}
exports.verifySession = verifySession;
function sendTryRefreshTokenResponse(recipeInstance, _, __, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            utils_1.sendNon200Response(
                recipeInstance,
                response,
                "try refresh token",
                recipeInstance.config.sessionExpiredStatusCode
            );
        } catch (err) {
            next(err);
        }
    });
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
function sendUnauthorisedResponse(recipeInstance, _, __, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            utils_1.sendNon200Response(
                recipeInstance,
                response,
                "unauthorised",
                recipeInstance.config.sessionExpiredStatusCode
            );
        } catch (err) {
            next(err);
        }
    });
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, _, __, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield recipeInstance.revokeSession(sessionHandle);
            utils_1.sendNon200Response(
                recipeInstance,
                response,
                "token theft detected",
                recipeInstance.config.sessionExpiredStatusCode
            );
        } catch (err) {
            next(err);
        }
    });
}
exports.sendTokenTheftDetectedResponse = sendTokenTheftDetectedResponse;
//# sourceMappingURL=middleware.js.map
