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
class APIImplementation {
    constructor() {
        this.healthCheckGET = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let connectionURI = input.hosts;
                let apiKey = input.apiKey;
                let querier = yield querier_1.Querier.getNewInstanceOrThrowError("Dev");
                let coreResponse = yield checkConnectionToCore(querier, connectionURI, apiKey);
                return coreResponse;
            });
    }
}
exports.default = APIImplementation;
function checkConnectionToCore(querier, connectionURI, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/hello"), undefined);
            if (String(response).startsWith("Hello")) {
                if (
                    connectionURI === null || connectionURI === void 0
                        ? void 0
                        : connectionURI.includes("try.supertokens.io")
                ) {
                    return {
                        status: "OK",
                        message:
                            "You are currently using try.supertokens.io for your core. This is for demo purposes only, so please replace this with the address of your managed core instance (sign up on supertokens.io), or the address of your self host a core instance.",
                    };
                }
                return {
                    status: "OK",
                };
            }
        } catch (err) {
            if (err.message.includes("Invalid API key")) {
                if (apiKey === undefined) {
                    return {
                        status: "NOT OK",
                        message:
                            "The configured SuperTokens core requires an API key. Please make sure that you have set it in your backend init function call. If using our managed service, you can find your API key on the dashboard at supertokens.io",
                    };
                }
                return {
                    status: "NOT OK",
                    message:
                        "It seems like your API key is incorrect. Please double check that you have provided the right key.",
                };
            }
            return {
                status: "NOT OK",
                message: err.message,
            };
        }
        return { status: "NOT OK" };
    });
}
