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
const utils_1 = require("../../../../../utils");
function defaultCreateAndSendCustomEmail(appInfo) {
    return (input, _) =>
        __awaiter(this, void 0, void 0, function* () {
            if (process.env.TEST_MODE === "testing") {
                return;
            }
            const result = yield utils_1.postWithFetch(
                "https://api.supertokens.io/0/st/auth/passwordless/login",
                {
                    "api-version": "0",
                    "content-type": "application/json; charset=utf-8",
                },
                {
                    email: input.email,
                    appName: appInfo.appName,
                    codeLifetime: input.codeLifetime,
                    urlWithLinkCode: input.urlWithLinkCode,
                    userInputCode: input.userInputCode,
                },
                {
                    successLog: `Email sent to ${input.email}`,
                    errorLogHeader: "Error sending passwordless login email",
                }
            );
            if ("error" in result) {
                throw result.error;
            }
            if (result.resp && result.resp.status >= 400) {
                if (result.resp.body.err) {
                    /**
                     * if the error is thrown from API, the response object
                     * will be of type `{err: string}`
                     */
                    throw new Error(result.resp.body.err);
                } else {
                    throw new Error(`Request failed with status code ${result.resp.status}`);
                }
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
