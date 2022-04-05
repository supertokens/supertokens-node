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
function defaultCreateAndSendCustomSms(_) {
    return (__, _) =>
        __awaiter(this, void 0, void 0, function* () {
            if (process.env.TEST_MODE === "testing") {
                return;
            }
            // TODO
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
        this.appInfo = appInfo;
        this.createAndSendCustomSms =
            createAndSendCustomSms === undefined ? defaultCreateAndSendCustomSms(this.appInfo) : createAndSendCustomSms;
    }
}
exports.default = BackwardCompatibilityService;
