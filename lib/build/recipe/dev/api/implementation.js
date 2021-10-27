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
const querier_1 = require("../../../querier");
const normalisedURLPath_1 = require("../../../normalisedURLPath");
const utils_1 = require("../utils");
class APIImplementation {
    constructor() {
        this.healthCheckGET = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let querier = yield querier_1.Querier.getNewInstanceOrThrowError("Dev");
                let coreResponse = yield checkConnectionToCore(querier, input.hosts, input.apiKey, input.recipeModules);
                return coreResponse;
            });
    }
}
exports.default = APIImplementation;
function checkConnectionToCore(querier, connectionURI, apiKey, recipeModules) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/hello"), undefined);
            if (String(response).startsWith("Hello")) {
                let usingDevelopmentKeysMessage = (yield utils_1.isUsingDevelopmentClientId(recipeModules))
                    ? "You are currently using development OAuth keys. Please replace them with your own OAuth keys for production use"
                    : undefined;
                if (
                    connectionURI === null || connectionURI === void 0
                        ? void 0
                        : connectionURI.includes("https://try.supertokens.io")
                ) {
                    let usingDevCoreMessage =
                        "You are currently using try.supertokens.io for your core. This is for demo purposes only, so please replace this with the address of your managed core instance (sign up on supertokens.io), or the address of your self host a core instance.";
                    let message = usingDevelopmentKeysMessage
                        ? usingDevCoreMessage + "  " + usingDevelopmentKeysMessage
                        : usingDevCoreMessage;
                    return {
                        status: "OK",
                        message,
                    };
                }
                return {
                    status: "OK",
                    message: usingDevelopmentKeysMessage,
                };
            }
        } catch (err) {
            let status = "NOT OK";
            if (err.message.includes("Invalid API key")) {
                if (apiKey === undefined) {
                    return {
                        status,
                        message:
                            "The configured SuperTokens core requires an API key. Please make sure that you have set it in your backend init function call. If you are using our managed service, you can find your API key on the dashboard at supertokens.io",
                    };
                }
                return {
                    status,
                    message:
                        "It seems like your API key is incorrect. Please double check that you have provided the right key.",
                };
            }
            return {
                status,
                message: err.message,
            };
        }
        return { status: "NOT OK" };
    });
}
