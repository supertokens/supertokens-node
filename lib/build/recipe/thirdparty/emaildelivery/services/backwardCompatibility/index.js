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
const backwardCompatibility_1 = require("../../../../emailverification/emaildelivery/services/backwardCompatibility");
class BackwardCompatibilityService {
    constructor(recipeInterfaceImpl, appInfo, isInServerlessEnv, emailVerificationFeature) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                yield this.emailVerificationBackwardCompatibilityService.sendEmail(input);
            });
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
                                  let userInfo = yield recipeInterfaceImpl.getUserById({
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
                appInfo,
                isInServerlessEnv,
                emailVerificationFeatureNormalisedConfig.createAndSendCustomEmail
            );
        }
    }
}
exports.default = BackwardCompatibilityService;
