"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("./error"));
const utils_1 = require("./utils");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const consumeCode_1 = __importDefault(require("./api/consumeCode"));
const createCode_1 = __importDefault(require("./api/createCode"));
const emailExists_1 = __importDefault(require("./api/emailExists"));
const phoneNumberExists_1 = __importDefault(require("./api/phoneNumberExists"));
const resendCode_1 = __importDefault(require("./api/resendCode"));
const constants_1 = require("./constants");
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
const smsdelivery_1 = __importDefault(require("../../ingredients/smsdelivery"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_1 = __importDefault(require("../multifactorauth/recipe"));
const utils_2 = require("./utils");
const utils_3 = require("../thirdparty/utils");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, ingredients) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    id: constants_1.CONSUME_CODE_API,
                    disabled: this.apiImpl.consumeCodePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.CONSUME_CODE_API),
                },
                {
                    id: constants_1.CREATE_CODE_API,
                    disabled: this.apiImpl.createCodePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.CREATE_CODE_API),
                },
                {
                    id: constants_1.DOES_EMAIL_EXIST_API,
                    disabled: this.apiImpl.emailExistsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.DOES_EMAIL_EXIST_API),
                },
                {
                    id: constants_1.DOES_PHONE_NUMBER_EXIST_API,
                    disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.DOES_PHONE_NUMBER_EXIST_API),
                },
                {
                    id: constants_1.RESEND_CODE_API,
                    disabled: this.apiImpl.resendCodePOST === undefined,
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.RESEND_CODE_API),
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _, __, userContext) => {
            const options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
                emailDelivery: this.emailDelivery,
                smsDelivery: this.smsDelivery,
                appInfo: this.getAppInfo(),
            };
            if (id === constants_1.CONSUME_CODE_API) {
                return await consumeCode_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.CREATE_CODE_API) {
                return await createCode_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.DOES_EMAIL_EXIST_API) {
                return await emailExists_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.DOES_PHONE_NUMBER_EXIST_API) {
                return await phoneNumberExists_1.default(this.apiImpl, tenantId, options, userContext);
            } else {
                return await resendCode_1.default(this.apiImpl, tenantId, options, userContext);
            }
        };
        this.handleError = async (err, _, __) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        // helper functions below...
        this.createMagicLink = async (input) => {
            let userInputCode =
                this.config.getCustomUserInputCode !== undefined
                    ? await this.config.getCustomUserInputCode(input.tenantId, input.userContext)
                    : undefined;
            const codeInfo = await this.recipeInterfaceImpl.createCode(
                "email" in input
                    ? {
                          email: input.email,
                          userInputCode,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          phoneNumber: input.phoneNumber,
                          userInputCode,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );
            const appInfo = this.getAppInfo();
            let magicLink =
                appInfo
                    .getOrigin({
                        request: input.request,
                        userContext: input.userContext,
                    })
                    .getAsStringDangerous() +
                appInfo.websiteBasePath.getAsStringDangerous() +
                "/verify" +
                "?rid=" +
                this.getRecipeId() +
                "&preAuthSessionId=" +
                codeInfo.preAuthSessionId +
                "&tenantId=" +
                input.tenantId +
                "#" +
                codeInfo.linkCode;
            return magicLink;
        };
        this.signInUp = async (input) => {
            let codeInfo = await this.recipeInterfaceImpl.createCode(
                "email" in input
                    ? {
                          email: input.email,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          phoneNumber: input.phoneNumber,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );
            let consumeCodeResponse = await this.recipeInterfaceImpl.consumeCode(
                this.config.flowType === "MAGIC_LINK"
                    ? {
                          preAuthSessionId: codeInfo.preAuthSessionId,
                          linkCode: codeInfo.linkCode,
                          tenantId: input.tenantId,
                          shouldAttemptAccountLinkingIfAllowed: input.shouldAttemptAccountLinkingIfAllowed,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: codeInfo.preAuthSessionId,
                          deviceId: codeInfo.deviceId,
                          userInputCode: codeInfo.userInputCode,
                          tenantId: input.tenantId,
                          shouldAttemptAccountLinkingIfAllowed: input.shouldAttemptAccountLinkingIfAllowed,
                          userContext: input.userContext,
                      }
            );
            if (consumeCodeResponse.status === "OK") {
                return {
                    status: "OK",
                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                    recipeUserId: consumeCodeResponse.recipeUserId,
                    user: consumeCodeResponse.user,
                };
            } else {
                throw new Error("Failed to create user. Please retry");
            }
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId))
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new emaildelivery_1.default(this.config.getEmailDeliveryConfig())
                : ingredients.emailDelivery;
        this.smsDelivery =
            ingredients.smsDelivery === undefined
                ? new smsdelivery_1.default(this.config.getSmsDeliveryConfig())
                : ingredients.smsDelivery;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                    smsDelivery: undefined,
                });
                let otpOrLink = [];
                let emailOrPhone = [];
                if (Recipe.instance.config.flowType === "MAGIC_LINK") {
                    otpOrLink.push("link");
                } else if (Recipe.instance.config.flowType === "USER_INPUT_CODE") {
                    otpOrLink.push("otp");
                } else {
                    otpOrLink.push("otp");
                    otpOrLink.push("link");
                }
                if (Recipe.instance.config.contactMethod === "EMAIL") {
                    emailOrPhone.push("email");
                } else if (Recipe.instance.config.contactMethod === "PHONE") {
                    emailOrPhone.push("phone");
                } else {
                    emailOrPhone.push("email");
                    emailOrPhone.push("phone");
                }
                const allFactors = [];
                for (const ol of otpOrLink) {
                    for (const ep of emailOrPhone) {
                        allFactors.push(`${ol}-${ep}`);
                    }
                }
                postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    const mfaInstance = recipe_1.default.getInstance();
                    if (mfaInstance !== undefined) {
                        mfaInstance.addGetAllFactorsFromOtherRecipesFunc((tenantConfig) => {
                            if (tenantConfig.passwordless.enabled === false) {
                                return [];
                            }
                            return allFactors;
                        });
                        mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(async (user) => {
                            // We deliberately do not check for matching tenantId because we assume
                            // MFA is app-wide by default. User can always override MFA function
                            // to make it tenant specific.
                            return allFactors.filter((id) => utils_2.isFactorSetupForUser(user, id));
                        });
                        mfaInstance.addGetEmailsForFactorFromOtherRecipes((user, sessionRecipeUserId) => {
                            // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346
                            let sessionEmail = user.loginMethods.find(
                                (lm) => lm.recipeUserId.getAsString() === sessionRecipeUserId.getAsString()
                            ).email;
                            if (sessionEmail !== undefined && utils_3.isFakeEmail(sessionEmail)) {
                                sessionEmail = undefined;
                            }
                            const recipeLoginMethods = user.loginMethods.filter(
                                (lm) =>
                                    lm.recipeId === Recipe.RECIPE_ID &&
                                    lm.email !== undefined &&
                                    !utils_3.isFakeEmail(lm.email)
                            );
                            // We order by join date ASC (so oldest first)
                            let emails = recipeLoginMethods
                                .sort((lma, lmb) => lma.timeJoined - lmb.timeJoined)
                                .map((lm) => lm.email);
                            if (sessionEmail !== undefined) {
                                if (emails.includes(sessionEmail)) {
                                    // if the email address associated with the current session can be used here
                                    // it should be the first one we recommend regardless of timeJoined
                                    emails = [sessionEmail, ...emails.filter((email) => email !== sessionEmail)];
                                } else if (emails.length === 0) {
                                    emails = [sessionEmail];
                                }
                            }
                            let res = {};
                            if (allFactors.includes("otp-email")) {
                                res["otp-email"] = emails;
                            }
                            if (allFactors.includes("link-email")) {
                                res["link-email"] = emails;
                            }
                            return res;
                        });
                        mfaInstance.addGetPhoneNumbersForFactorsFromOtherRecipes((user, sessionRecipeUserId) => {
                            // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346
                            let sessionPhone = user.loginMethods.find(
                                (lm) => lm.recipeUserId.getAsString() === sessionRecipeUserId.getAsString()
                            ).phoneNumber;
                            const recipeLoginMethods = user.loginMethods.filter(
                                (lm) => lm.recipeId === Recipe.RECIPE_ID && lm.phoneNumber !== undefined
                            );
                            // We order by join date ASC (so oldest first)
                            let phoneNumbers = recipeLoginMethods
                                .sort((lma, lmb) => lma.timeJoined - lmb.timeJoined)
                                .map((lm) => lm.phoneNumber);
                            if (sessionPhone !== undefined) {
                                if (phoneNumbers.includes(sessionPhone)) {
                                    // if the phoneNumber associated with the current session can be used here
                                    // it should be the first one we recommend regardless of timeJoined
                                    phoneNumbers = [
                                        sessionPhone,
                                        ...phoneNumbers.filter((phoneNumber) => phoneNumber !== sessionPhone),
                                    ];
                                } else if (phoneNumbers.length === 0) {
                                    phoneNumbers = [sessionPhone];
                                }
                            }
                            let res = {};
                            if (allFactors.includes("otp-phone")) {
                                res["otp-phone"] = phoneNumbers;
                            }
                            if (allFactors.includes("link-phone")) {
                                res["link-phone"] = phoneNumbers;
                            }
                            return res;
                        });
                    }
                });
                return Recipe.instance;
            } else {
                throw new Error("Passwordless recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "passwordless";
