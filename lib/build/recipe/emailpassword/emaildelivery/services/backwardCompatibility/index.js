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
const passwordResetFunctions_1 = require("../../../passwordResetFunctions");
class BackwardCompatibilityService {
    constructor(recipeInterfaceImpl, appInfo, isInServerlessEnv, resetPasswordUsingTokenFeature) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield this.recipeInterfaceImpl.getUserById({
                    userId: input.user.id,
                    userContext: input.userContext,
                });
                if (user === undefined) {
                    throw Error("this should never come here");
                }
                try {
                    if (!this.isInServerlessEnv) {
                        this.resetPasswordUsingTokenFeature
                            .createAndSendCustomEmail(user, input.passwordResetLink, input.userContext)
                            .catch((_) => {});
                    } else {
                        // see https://github.com/supertokens/supertokens-node/pull/135
                        yield this.resetPasswordUsingTokenFeature.createAndSendCustomEmail(
                            user,
                            input.passwordResetLink,
                            input.userContext
                        );
                    }
                } catch (_) {}
            });
        this.recipeInterfaceImpl = recipeInterfaceImpl;
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
        {
            let inputCreateAndSendCustomEmail =
                resetPasswordUsingTokenFeature === null || resetPasswordUsingTokenFeature === void 0
                    ? void 0
                    : resetPasswordUsingTokenFeature.createAndSendCustomEmail;
            this.resetPasswordUsingTokenFeature =
                inputCreateAndSendCustomEmail !== undefined
                    ? {
                          createAndSendCustomEmail: inputCreateAndSendCustomEmail,
                      }
                    : {
                          createAndSendCustomEmail: passwordResetFunctions_1.createAndSendCustomEmail(this.appInfo),
                      };
        }
    }
}
exports.default = BackwardCompatibilityService;
