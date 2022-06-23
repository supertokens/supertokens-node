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
const axios_1 = require("axios");
const logger_1 = require("../../../../../logger");
function defaultCreateAndSendCustomEmail(appInfo) {
    return (input, _) =>
        __awaiter(this, void 0, void 0, function* () {
            if (process.env.TEST_MODE === "testing") {
                return;
            }
            try {
                yield axios_1.default({
                    method: "POST",
                    url: "https://api.supertokens.io/0/st/auth/passwordless/login",
                    data: {
                        email: input.email,
                        appName: appInfo.appName,
                        codeLifetime: input.codeLifetime,
                        urlWithLinkCode: input.urlWithLinkCode,
                        userInputCode: input.userInputCode,
                    },
                    headers: {
                        "api-version": 0,
                    },
                });
                logger_1.logDebugMessage(`Email sent to ${input.email}`);
            } catch (error) {
                logger_1.logDebugMessage("Error sending passwordless login email");
                if (axios_1.default.isAxiosError(error)) {
                    const err = error;
                    if (err.response) {
                        logger_1.logDebugMessage(`Error status: ${err.response.status}`);
                        logger_1.logDebugMessage(`Error response: ${JSON.stringify(err.response.data)}`);
                    } else {
                        logger_1.logDebugMessage(`Error: ${err.message}`);
                    }
                } else {
                    logger_1.logDebugMessage(`Error: ${JSON.stringify(error)}`);
                }
                logger_1.logDebugMessage("Logging the input below:");
                logger_1.logDebugMessage(
                    JSON.stringify(
                        {
                            email: input.email,
                            appName: appInfo.appName,
                            codeLifetime: input.codeLifetime,
                            urlWithLinkCode: input.urlWithLinkCode,
                            userInputCode: input.userInputCode,
                        },
                        null,
                        2
                    )
                );
                /**
                 * if the error is thrown from API, the response object
                 * will be of type `{err: string}`
                 */
                if (axios_1.default.isAxiosError(error) && error.response !== undefined) {
                    if (error.response.data.err !== undefined) {
                        throw Error(error.response.data.err);
                    }
                }
                throw error;
            }
        });
}
class BackwardCompatibilityService {
    constructor(appInfo, createAndSendCustomEmail) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.createAndSendCustomEmail(
                    {
                        email: input.email,
                        userInputCode: input.userInputCode,
                        urlWithLinkCode: input.urlWithLinkCode,
                        preAuthSessionId: input.preAuthSessionId,
                        codeLifetime: input.codeLifetime,
                    },
                    input.userContext
                );
            });
        this.createAndSendCustomEmail =
            createAndSendCustomEmail === undefined
                ? defaultCreateAndSendCustomEmail(appInfo)
                : createAndSendCustomEmail;
    }
}
exports.default = BackwardCompatibilityService;
