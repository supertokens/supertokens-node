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
const emailVerificationFunctions_1 = require("../../../emailVerificationFunctions");
class BackwardCompatibilityService {
    constructor(appInfo, isInServerlessEnv, createAndSendCustomEmail) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!this.isInServerlessEnv) {
                        this.createAndSendCustomEmail(
                            input.user,
                            input.emailVerifyLink,
                            input.userContext
                        ).catch((_) => {});
                    } else {
                        // see https://github.com/supertokens/supertokens-node/pull/135
                        yield this.createAndSendCustomEmail(input.user, input.emailVerifyLink, input.userContext);
                    }
                } catch (_) {}
            });
        this.appInfo = appInfo;
        this.isInServerlessEnv = isInServerlessEnv;
        this.createAndSendCustomEmail =
            createAndSendCustomEmail === undefined
                ? emailVerificationFunctions_1.createAndSendCustomEmail(this.appInfo)
                : createAndSendCustomEmail;
    }
}
exports.default = BackwardCompatibilityService;
