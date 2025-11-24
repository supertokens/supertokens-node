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
const recipe_2 = __importDefault(require("../multitenancy/recipe"));
const utils_2 = require("../thirdparty/utils");
const multifactorauth_1 = require("../multifactorauth");
const utils_3 = require("../../utils");
const plugins_1 = require("../../plugins");
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
                    id: constants_1.DOES_EMAIL_EXIST_API_OLD,
                    disabled: this.apiImpl.emailExistsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.DOES_EMAIL_EXIST_API_OLD),
                },
                {
                    id: constants_1.DOES_PHONE_NUMBER_EXIST_API,
                    disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.DOES_PHONE_NUMBER_EXIST_API),
                },
                {
                    id: constants_1.DOES_PHONE_NUMBER_EXIST_API_OLD,
                    disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.DOES_PHONE_NUMBER_EXIST_API_OLD
                    ),
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
                return await (0, consumeCode_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.CREATE_CODE_API) {
                return await (0, createCode_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.DOES_EMAIL_EXIST_API || id === constants_1.DOES_EMAIL_EXIST_API_OLD) {
                return await (0, emailExists_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (
                id === constants_1.DOES_PHONE_NUMBER_EXIST_API ||
                id === constants_1.DOES_PHONE_NUMBER_EXIST_API_OLD
            ) {
                return await (0, phoneNumberExists_1.default)(this.apiImpl, tenantId, options, userContext);
            } else {
                return await (0, resendCode_1.default)(this.apiImpl, tenantId, options, userContext);
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
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          phoneNumber: input.phoneNumber,
                          userInputCode,
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );
            if (codeInfo.status !== "OK") {
                throw new Error("Failed to create user. Please retry");
            }
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
                "?preAuthSessionId=" +
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
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          userContext: input.userContext,
                      }
                    : {
                          phoneNumber: input.phoneNumber,
                          tenantId: input.tenantId,
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          userContext: input.userContext,
                      }
            );
            if (codeInfo.status !== "OK") {
                throw new Error("Failed to create user. Please retry");
            }
            let consumeCodeResponse = await this.recipeInterfaceImpl.consumeCode(
                this.config.flowType === "MAGIC_LINK"
                    ? {
                          preAuthSessionId: codeInfo.preAuthSessionId,
                          linkCode: codeInfo.linkCode,
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: codeInfo.preAuthSessionId,
                          deviceId: codeInfo.deviceId,
                          userInputCode: codeInfo.userInputCode,
                          session: input.session,
                          shouldTryLinkingWithSessionUser: !!input.session,
                          tenantId: input.tenantId,
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
        this.config = (0, utils_1.validateAndNormaliseUserInput)(this, appInfo, config);
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(querier_1.Querier.getNewInstanceOrThrowError(recipeId))
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
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
        let allFactors = (0, utils_1.getEnabledPwlessFactors)(this.config);
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mfaInstance = recipe_1.default.getInstance();
            if (mfaInstance !== undefined) {
                mfaInstance.addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes(() => {
                    return allFactors;
                });
                mfaInstance.addFuncToGetFactorsSetupForUserFromOtherRecipes(async (user) => {
                    // We deliberately do not check for matching tenantId because
                    // even if the user is logging into a tenant does not have
                    // passwordless loginMethod, the frontend will call the
                    // same consumeCode API as if there was a passwordless user.
                    // the only diff is that a new recipe user will be associated with the session tenant
                    function isFactorSetupForUser(user, factorId) {
                        for (const loginMethod of user.loginMethods) {
                            if (loginMethod.recipeId !== Recipe.RECIPE_ID) {
                                continue;
                            }
                            // Notice that we also check for if the email is fake or not,
                            // cause if it is fake, then we should not consider it as setup
                            // so that the frontend asks the user to enter an email,
                            // or uses the email of another login method.
                            if (loginMethod.email !== undefined && !(0, utils_2.isFakeEmail)(loginMethod.email)) {
                                if (
                                    factorId === multifactorauth_1.FactorIds.OTP_EMAIL ||
                                    factorId === multifactorauth_1.FactorIds.LINK_EMAIL
                                ) {
                                    return true;
                                }
                            }
                            if (loginMethod.phoneNumber !== undefined) {
                                if (
                                    factorId === multifactorauth_1.FactorIds.OTP_PHONE ||
                                    factorId === multifactorauth_1.FactorIds.LINK_PHONE
                                ) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }
                    return allFactors.filter((id) => isFactorSetupForUser(user, id));
                });
                mfaInstance.addFuncToGetEmailsForFactorFromOtherRecipes((user, sessionRecipeUserId) => {
                    // This function is called in the MFA info endpoint API.
                    // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346
                    // preparing some reusable variables for the logic below...
                    const sessionLoginMethod = user.loginMethods.find((lM) => {
                        return lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString();
                    });
                    if (sessionLoginMethod === undefined) {
                        // this can happen maybe cause this login method
                        // was unlinked from the user or deleted entirely...
                        return {
                            status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                        };
                    }
                    const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                        return a.timeJoined - b.timeJoined;
                    });
                    // MAIN LOGIC FOR THE FUNCTION STARTS HERE
                    let nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined = [];
                    for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                        // in the if statement below, we also check for if the email
                        // is fake or not cause if it is fake, then we consider that
                        // that login method is not setup for passwordless, and instead
                        // we want to ask the user to enter their email, or to use
                        // another login method that has no fake email.
                        if (orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !(0, utils_2.isFakeEmail)(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
                            ) {
                                // loginmethods for passwordless are guaranteed to have unique emails
                                // across all the loginmethods for a user.
                                nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.push(
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].email
                                );
                            }
                        }
                    }
                    if (nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.length === 0) {
                        // this means that this factor is not setup for email based factors.
                        // However, we still check if there is an email for this user
                        // from other loginMethods, and return those. The frontend
                        // will then call the consumeCode API eventually.
                        // first we check if the session loginMethod has an email
                        // and return that. Cause if it does, then the UX will be good
                        // in that the user will set a password for the the email
                        // they used to login into the current session.
                        // when constructing the emails array, we prioritize
                        // the session user's email cause it's a better UX
                        // for setting or asking for the OTP for the same email
                        // that the user used to login.
                        let emailsResult = [];
                        if (
                            sessionLoginMethod.email !== undefined &&
                            !(0, utils_2.isFakeEmail)(sessionLoginMethod.email)
                        ) {
                            emailsResult = [sessionLoginMethod.email];
                        }
                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !(0, utils_2.isFakeEmail)(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
                            ) {
                                // we have the if check below cause different loginMethods
                                // across different recipes can have the same email.
                                if (!emailsResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)) {
                                    emailsResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].email);
                                }
                            }
                        }
                        let factorIdToEmailsMap = {};
                        if (allFactors.includes(multifactorauth_1.FactorIds.OTP_EMAIL)) {
                            factorIdToEmailsMap[multifactorauth_1.FactorIds.OTP_EMAIL] = emailsResult;
                        }
                        if (allFactors.includes(multifactorauth_1.FactorIds.LINK_EMAIL)) {
                            factorIdToEmailsMap[multifactorauth_1.FactorIds.LINK_EMAIL] = emailsResult;
                        }
                        return {
                            status: "OK",
                            factorIdToEmailsMap,
                        };
                    } else if (nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this email and not others cause we want to
                        // not create more loginMethods with passwordless for the user
                        // object.
                        let factorIdToEmailsMap = {};
                        if (allFactors.includes(multifactorauth_1.FactorIds.OTP_EMAIL)) {
                            factorIdToEmailsMap[multifactorauth_1.FactorIds.OTP_EMAIL] =
                                nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        if (allFactors.includes(multifactorauth_1.FactorIds.LINK_EMAIL)) {
                            factorIdToEmailsMap[multifactorauth_1.FactorIds.LINK_EMAIL] =
                                nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        return {
                            status: "OK",
                            factorIdToEmailsMap,
                        };
                    }
                    // Finally, we return all emails that have passwordless login
                    // method for this user, but keep the session's email first
                    // if the session's email is in the list of
                    // nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined (for better UX)
                    let emailsResult = [];
                    if (
                        sessionLoginMethod.email !== undefined &&
                        nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.includes(sessionLoginMethod.email)
                    ) {
                        emailsResult = [sessionLoginMethod.email];
                    }
                    for (let i = 0; i < nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.length; i++) {
                        if (!emailsResult.includes(nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined[i])) {
                            emailsResult.push(nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined[i]);
                        }
                    }
                    let factorIdToEmailsMap = {};
                    if (allFactors.includes(multifactorauth_1.FactorIds.OTP_EMAIL)) {
                        factorIdToEmailsMap[multifactorauth_1.FactorIds.OTP_EMAIL] = emailsResult;
                    }
                    if (allFactors.includes(multifactorauth_1.FactorIds.LINK_EMAIL)) {
                        factorIdToEmailsMap[multifactorauth_1.FactorIds.LINK_EMAIL] = emailsResult;
                    }
                    return {
                        status: "OK",
                        factorIdToEmailsMap,
                    };
                });
                mfaInstance.addFuncToGetPhoneNumbersForFactorsFromOtherRecipes((user, sessionRecipeUserId) => {
                    // This function is called in the MFA info endpoint API.
                    // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346
                    // preparing some reusable variables for the logic below...
                    const sessionLoginMethod = user.loginMethods.find((lM) => {
                        return lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString();
                    });
                    if (sessionLoginMethod === undefined) {
                        // this can happen maybe cause this login method
                        // was unlinked from the user or deleted entirely...
                        return {
                            status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                        };
                    }
                    const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                        return a.timeJoined - b.timeJoined;
                    });
                    // MAIN LOGIC FOR THE FUNCTION STARTS HERE
                    let phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined = [];
                    for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                        // in the if statement below, we also check for if the email
                        // is fake or not cause if it is fake, then we consider that
                        // that login method is not setup for passwordless, and instead
                        // we want to ask the user to enter their email, or to use
                        // another login method that has no fake email.
                        if (orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID) {
                            if (orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber !== undefined) {
                                // loginmethods for passwordless are guaranteed to have unique phone numbers
                                // across all the loginmethods for a user.
                                phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.push(
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber
                                );
                            }
                        }
                    }
                    if (phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.length === 0) {
                        // this means that this factor is not setup for phone based factors.
                        // However, we still check if there is a phone for this user
                        // from other loginMethods, and return those. The frontend
                        // will then call the consumeCode API eventually.
                        // first we check if the session loginMethod has a phone number
                        // and return that. Cause if it does, then the UX will be good
                        // in that the user will set a password for the the email
                        // they used to login into the current session.
                        // when constructing the phone numbers array, we prioritize
                        // the session user's phone number cause it's a better UX
                        // for setting or asking for the OTP for the same phone number
                        // that the user used to login.
                        let phonesResult = [];
                        if (sessionLoginMethod.phoneNumber !== undefined) {
                            phonesResult = [sessionLoginMethod.phoneNumber];
                        }
                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber !== undefined) {
                                // we have the if check below cause different loginMethods
                                // across different recipes can have the same phone number.
                                if (!phonesResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber)) {
                                    phonesResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber);
                                }
                            }
                        }
                        let factorIdToPhoneNumberMap = {};
                        if (allFactors.includes(multifactorauth_1.FactorIds.OTP_PHONE)) {
                            factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.OTP_PHONE] = phonesResult;
                        }
                        if (allFactors.includes(multifactorauth_1.FactorIds.LINK_PHONE)) {
                            factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.LINK_PHONE] = phonesResult;
                        }
                        return {
                            status: "OK",
                            factorIdToPhoneNumberMap,
                        };
                    } else if (phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this phone number and not others cause we want to
                        // not create more loginMethods with passwordless for the user
                        // object.
                        let factorIdToPhoneNumberMap = {};
                        if (allFactors.includes(multifactorauth_1.FactorIds.OTP_PHONE)) {
                            factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.OTP_PHONE] =
                                phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        if (allFactors.includes(multifactorauth_1.FactorIds.LINK_PHONE)) {
                            factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.LINK_PHONE] =
                                phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        return {
                            status: "OK",
                            factorIdToPhoneNumberMap,
                        };
                    }
                    // Finally, we return all phones that have passwordless login
                    // method for this user, but keep the session's phone first
                    // if the session's phone is in the list of
                    // phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined (for better UX)
                    let phonesResult = [];
                    if (
                        sessionLoginMethod.phoneNumber !== undefined &&
                        phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.includes(
                            sessionLoginMethod.phoneNumber
                        )
                    ) {
                        phonesResult = [sessionLoginMethod.phoneNumber];
                    }
                    for (let i = 0; i < phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.length; i++) {
                        if (!phonesResult.includes(phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined[i])) {
                            phonesResult.push(phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined[i]);
                        }
                    }
                    let factorIdToPhoneNumberMap = {};
                    if (allFactors.includes(multifactorauth_1.FactorIds.OTP_PHONE)) {
                        factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.OTP_PHONE] = phonesResult;
                    }
                    if (allFactors.includes(multifactorauth_1.FactorIds.LINK_PHONE)) {
                        factorIdToPhoneNumberMap[multifactorauth_1.FactorIds.LINK_PHONE] = phonesResult;
                    }
                    return {
                        status: "OK",
                        factorIdToPhoneNumberMap,
                    };
                });
            }
            const mtRecipe = recipe_2.default.getInstance();
            if (mtRecipe !== undefined) {
                for (const factorId of allFactors) {
                    mtRecipe.allAvailableFirstFactors.push(factorId);
                }
            }
        });
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Passwordless.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    (0, plugins_1.applyPlugins)(
                        Recipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    ),
                    {
                        emailDelivery: undefined,
                        smsDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("Passwordless recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (!(0, utils_3.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "passwordless";
exports.default = Recipe;
