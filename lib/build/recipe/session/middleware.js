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
function isRefreshAPICall(recipeInstance, request) {
    let refreshTokenPath = recipeInstance.config.refreshTokenPath;
    let method = utils_1.normaliseHttpMethod(request.method);
    let incomingPath = new normalisedURLPath_1.default(
        recipeInstance,
        request.originalUrl === undefined ? request.url : request.originalUrl
    );
    return incomingPath.equals(refreshTokenPath) && method === "post";
}
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
                if (isRefreshAPICall(recipeInstance, request)) {
                    request.session = yield recipeInstance.refreshSession(request, response);
                } else {
                    request.session = yield recipeInstance.getSession(request, response, antiCsrfCheck);
                }
                return next();
            } catch (err) {
                /**
                 * checking:
                 *  - it should not be the refresh API
                 *  - error thrown should be either unauthorised or try refresh token
                 *  - sessionRequired parameter is set to false in options
                 */
                if (
                    !isRefreshAPICall(recipeInstance, request) &&
                    (err.type === error_1.default.UNAUTHORISED || err.type === error_1.default.TRY_REFRESH_TOKEN) &&
                    options !== undefined &&
                    typeof options !== "boolean" &&
                    options.sessionRequired === false
                ) {
                    return next();
                }
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
