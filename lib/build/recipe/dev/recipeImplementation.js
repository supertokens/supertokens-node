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
const normalisedURLPath_1 = require("../../normalisedURLPath");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
function getRecipeInterface(querier) {
    return {
        checkConnectionToCoreAndDevOAuthKeys: (apiKey, connectionURI) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/hello"), undefined);
                    if (String(response).startsWith("Hello")) {
                        if (
                            connectionURI === null || connectionURI === void 0
                                ? void 0
                                : connectionURI.includes("https://try.supertokens.io")
                        ) {
                            if (utils_1.isUsingDevelopmentClientId()) {
                                return {
                                    status: "OK",
                                    message:
                                        "1. " + constants_1.USING_DEV_CORE + "  2. " + constants_1.USING_DEV_OAUTH_KEY,
                                };
                            }
                            return {
                                status: "OK",
                                message: constants_1.USING_DEV_CORE,
                            };
                        }
                        if (yield utils_1.isUsingDevelopmentClientId()) {
                            return {
                                status: "OK",
                                message: constants_1.USING_DEV_OAUTH_KEY,
                            };
                        } else {
                            return {
                                status: "OK",
                                message: constants_1.VALID_SETUP,
                            };
                        }
                    }
                } catch (err) {
                    if (err.message.includes("status code: 401")) {
                        if (apiKey === undefined) {
                            return {
                                status: "NOT_OK",
                                message: constants_1.NO_API_KEY,
                            };
                        }
                        return {
                            status: "NOT_OK",
                            message: constants_1.INVALID_API_KEY,
                        };
                    }
                    return {
                        status: "NOT_OK",
                        message: err.message,
                    };
                }
                return {
                    status: "NOT_OK",
                    message: constants_1.INTERNAL_ERROR,
                };
            }),
    };
}
exports.default = getRecipeInterface;
