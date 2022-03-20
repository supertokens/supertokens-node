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
const backwardCompatibility_1 = require("../../../../emailverification/emaildelivery/services/backwardCompatibility");
class BackwardCompatibilityService {
    constructor(
        recipeInterfaceImpl,
        appInfo,
        isInServerlessEnv,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature
    ) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                if (input.type === "EMAIL_VERIFICATION") {
                    yield this.emailVerificationBackwardCompatibilityService.sendEmail(input);
                } else {
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
                }
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
        {
            const inputCreateAndSendCustomEmail =
                emailVerificationFeature === null || emailVerificationFeature === void 0
                    ? void 0
                    : emailVerificationFeature.createAndSendCustomEmail;
            let emailVerificationFeatureNormalisedConfig =
                inputCreateAndSendCustomEmail !== undefined
                    ? {
                          createAndSendCustomEmail: (user, link, userContext) =>
                              __awaiter(this, void 0, void 0, function* () {
                                  let userInfo = yield this.recipeInterfaceImpl.getUserById({
                                      userId: user.id,
                                      userContext,
                                  });
                                  if (userInfo === undefined) {
                                      throw new Error("Unknown User ID provided");
                                  }
                                  return yield inputCreateAndSendCustomEmail(userInfo, link, userContext);
                              }),
                      }
                    : {};
            this.emailVerificationBackwardCompatibilityService = new backwardCompatibility_1.default(
                this.appInfo,
                this.isInServerlessEnv,
                emailVerificationFeatureNormalisedConfig.createAndSendCustomEmail
            );
        }
    }
}
exports.default = BackwardCompatibilityService;
