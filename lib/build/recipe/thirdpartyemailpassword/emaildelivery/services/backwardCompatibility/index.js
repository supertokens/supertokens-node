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
const services_1 = require("../../../../emailverification/emaildelivery/services");
const services_2 = require("../../../../emailpassword/emaildelivery/services");
class BackwardCompatibilityService {
    constructor(recipeInstance, appInfo, resetPasswordUsingTokenFeature, emailVerificationFeature) {
        this.sendEmail = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (input.type === "EMAIL_VERIFICATION") {
                    const inputCreateAndSendCustomEmail =
                        (_a = this.emailVerificationFeature) === null || _a === void 0
                            ? void 0
                            : _a.createAndSendCustomEmail;
                    let createAndSendCustomEmail = undefined;
                    if (inputCreateAndSendCustomEmail !== undefined) {
                        createAndSendCustomEmail = (user, link, userContext) =>
                            __awaiter(this, void 0, void 0, function* () {
                                let userInfo = yield this.recipeInstance.recipeInterfaceImpl.getUserById({
                                    userId: user.id,
                                    userContext,
                                });
                                if (userInfo === undefined) {
                                    throw new Error("Unknown User ID provided");
                                }
                                return yield inputCreateAndSendCustomEmail(userInfo, link, userContext);
                            });
                    }
                    yield new services_1.BackwardCompatibilityService(
                        this.appInfo,
                        this.recipeInstance.isInServerlessEnv,
                        createAndSendCustomEmail
                    ).sendEmail(input);
                } else {
                    yield new services_2.BackwardCompatibilityService(
                        this.recipeInstance.emailPasswordRecipe,
                        this.appInfo,
                        this.resetPasswordUsingTokenFeature,
                        this.emailVerificationFeature
                    ).sendEmail(input);
                }
            });
        this.recipeInstance = recipeInstance;
        this.appInfo = appInfo;
        this.resetPasswordUsingTokenFeature = resetPasswordUsingTokenFeature;
        this.emailVerificationFeature = emailVerificationFeature;
    }
}
exports.default = BackwardCompatibilityService;
