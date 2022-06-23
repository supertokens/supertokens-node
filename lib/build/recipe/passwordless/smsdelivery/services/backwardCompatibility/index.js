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
const supertokens_1 = require("../../../../../ingredients/smsdelivery/services/supertokens");
const supertokens_2 = require("../../../../../supertokens");
const logger_1 = require("../../../../../logger");
function defaultCreateAndSendCustomSms(_) {
    return (input, _) =>
        __awaiter(this, void 0, void 0, function* () {
            let supertokens = supertokens_2.default.getInstanceOrThrowError();
            let appName = supertokens.appInfo.appName;
            try {
                yield axios_1.default({
                    method: "post",
                    url: supertokens_1.SUPERTOKENS_SMS_SERVICE_URL,
                    data: {
                        smsInput: {
                            appName,
                            type: "PASSWORDLESS_LOGIN",
                            phoneNumber: input.phoneNumber,
                            userInputCode: input.userInputCode,
                            urlWithLinkCode: input.urlWithLinkCode,
                            codeLifetime: input.codeLifetime,
                        },
                    },
                    headers: {
                        "api-version": "0",
                    },
                });
                logger_1.logDebugMessage(`Passwordless login SMS sent to ${input.phoneNumber}`);
                return;
            } catch (error) {
                logger_1.logDebugMessage("Error sending passwordless login SMS");
                if (axios_1.default.isAxiosError(error)) {
                    const err = error;
                    if (err.response) {
                        logger_1.logDebugMessage(`Error status: ${err.response.status}`);
                        logger_1.logDebugMessage(`Error response: ${JSON.stringify(err.response.data)}`);
                    } else {
                        logger_1.logDebugMessage(`Error: ${err.message}`);
                    }
                    if (err.response) {
                        if (err.response.status !== 429) {
                            /**
                             * if the error is thrown from API, the response object
                             * will be of type `{err: string}`
                             */
                            if (err.response.data.err !== undefined) {
                                throw Error(err.response.data.err);
                            } else {
                                throw err;
                            }
                        }
                    } else {
                        throw err;
                    }
                } else {
                    logger_1.logDebugMessage(`Error: ${JSON.stringify(error)}`);
                    throw error;
                }
            }
            console.log(
                "Free daily SMS quota reached. If you want to use SuperTokens to send SMS, please sign up on supertokens.com to get your SMS API key, else you can also define your own method by overriding the service. For now, we are logging it below:"
            );
            /**
             * if we do console.log(`SMS content: ${input}`);
             * Output would be:
             * SMS content: [object Object]
             */
            /**
             * JSON.stringify takes 3 inputs
             *  - value: usually an object or array, to be converted
             *  - replacer:  An array of strings and numbers that acts
             *               as an approved list for selecting the object
             *               properties that will be stringified
             *  - space: Adds indentation, white space, and line break characters
             *           to the return-value JSON text to make it easier to read
             *
             * console.log(JSON.stringify({"a": 1, "b": 2}))
             * Output:
             * {"a":1,"b":2}
             *
             * console.log(JSON.stringify({"a": 1, "b": 2}, null, 2))
             * Output:
             * {
             *   "a": 1,
             *   "b": 2
             * }
             */
            console.log(`\nSMS content: ${JSON.stringify(input, null, 2)}`);
        });
}
class BackwardCompatibilityService {
    constructor(appInfo, createAndSendCustomSms) {
        this.sendSms = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.createAndSendCustomSms(
                    {
                        phoneNumber: input.phoneNumber,
                        userInputCode: input.userInputCode,
                        urlWithLinkCode: input.urlWithLinkCode,
                        preAuthSessionId: input.preAuthSessionId,
                        codeLifetime: input.codeLifetime,
                    },
                    input.userContext
                );
            });
        this.createAndSendCustomSms =
            createAndSendCustomSms === undefined ? defaultCreateAndSendCustomSms(appInfo) : createAndSendCustomSms;
    }
}
exports.default = BackwardCompatibilityService;
