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
const supertokens_1 = require("../supertokens");
function defaultCreateAndSendCustomSms(_) {
    return (input, userContext) =>
        __awaiter(this, void 0, void 0, function* () {
            let supertokensService = new supertokens_1.default({});
            try {
                return yield supertokensService.sendSms(
                    Object.assign({ type: "PASSWORDLESS_LOGIN", userContext }, input)
                );
            } catch (err) {
                if (err.response === undefined || err.response.status !== 429) {
                    throw err;
                }
            }
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
            console.log(`SMS content: ${JSON.stringify(input, null, 2)}`);
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
