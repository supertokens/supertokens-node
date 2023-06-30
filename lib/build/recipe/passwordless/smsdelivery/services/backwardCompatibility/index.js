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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = require("../../../../../ingredients/smsdelivery/services/supertokens");
const supertokens_2 = __importDefault(require("../../../../../supertokens"));
const utils_1 = require("../../../../../utils");
function defaultCreateAndSendCustomSms(_) {
    return (input, _) =>
        __awaiter(this, void 0, void 0, function* () {
            let supertokens = supertokens_2.default.getInstanceOrThrowError();
            let appName = supertokens.appInfo.appName;
            const result = yield utils_1.postWithFetch(
                supertokens_1.SUPERTOKENS_SMS_SERVICE_URL,
                {
                    "api-version": "0",
                    "content-type": "application/json; charset=utf-8",
                },
                {
                    smsInput: {
                        appName,
                        type: "PASSWORDLESS_LOGIN",
                        phoneNumber: input.phoneNumber,
                        userInputCode: input.userInputCode,
                        urlWithLinkCode: input.urlWithLinkCode,
                        codeLifetime: input.codeLifetime,
                    },
                },
                {
                    successLog: `Passwordless login SMS sent to ${input.phoneNumber}`,
                    errorLogHeader: "Error sending passwordless login SMS",
                }
            );
            if ("error" in result) {
                throw result.error;
            }
            if (result.resp.status >= 400) {
                if (result.resp.status !== 429) {
                    if (result.resp.body.err) {
                        /**
                         * if the error is thrown from API, the response object
                         * will be of type `{err: string}`
                         */
                        throw new Error(result.resp.body.err);
                    } else {
                        throw new Error(`Request failed with status code ${result.resp.status}`);
                    }
                } else {
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
                    console.log(
                        "Free daily SMS quota reached. If you want to use SuperTokens to send SMS, please sign up on supertokens.com to get your SMS API key, else you can also define your own method by overriding the service. For now, we are logging it below:"
                    );
                    console.log(`\nSMS content: ${JSON.stringify(input, null, 2)}`);
                }
            }
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
