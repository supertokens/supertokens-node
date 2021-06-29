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
const utils_1 = require("../../../utils");
function sendTryRefreshTokenResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_1.sendNon200Response(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendTryRefreshTokenResponse = sendTryRefreshTokenResponse;
function sendUnauthorisedResponse(recipeInstance, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_1.sendNon200Response(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendUnauthorisedResponse = sendUnauthorisedResponse;
function sendTokenTheftDetectedResponse(recipeInstance, sessionHandle, _, __, response) {
    return __awaiter(this, void 0, void 0, function* () {
        yield recipeInstance.recipeInterfaceImpl.revokeSession({ sessionHandle });
        utils_1.sendNon200Response(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
    });
}
exports.sendTokenTheftDetectedResponse = sendTokenTheftDetectedResponse;
//# sourceMappingURL=middleware.js.map
