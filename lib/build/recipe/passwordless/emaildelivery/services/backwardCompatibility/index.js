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
function defaultCreateAndSendCustomEmail(_, __) {
    return __awaiter(this, void 0, void 0, function* () {});
}
class BackwardCompatibilityService {
    constructor(isInServerlessEnv, createAndSendCustomEmail) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!this.isInServerlessEnv) {
                        this.createAndSendCustomEmail(
                            {
                                email: input.email,
                                userInputCode: input.userInputCode,
                                urlWithLinkCode: input.urlWithLinkCode,
                                preAuthSessionId: input.preAuthSessionId,
                                codeLifetime: input.codeLifetime,
                            },
                            input.userContext
                        );
                    } else {
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
                    }
                } catch (_) {}
            });
        this.isInServerlessEnv = isInServerlessEnv;
        this.createAndSendCustomEmail =
            createAndSendCustomEmail === undefined ? defaultCreateAndSendCustomEmail : createAndSendCustomEmail;
    }
}
exports.default = BackwardCompatibilityService;
