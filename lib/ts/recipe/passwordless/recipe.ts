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

import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod, UserContext } from "../../types";
import STError from "./error";
import { getEnabledPwlessFactors, validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import consumeCodeAPI from "./api/consumeCode";
import createCodeAPI from "./api/createCode";
import emailExistsAPI from "./api/emailExists";
import phoneNumberExistsAPI from "./api/phoneNumberExists";
import resendCodeAPI from "./api/resendCode";
import {
    CONSUME_CODE_API,
    CREATE_CODE_API,
    DOES_EMAIL_EXIST_API,
    DOES_PHONE_NUMBER_EXIST_API,
    DOES_EMAIL_EXIST_API_OLD,
    DOES_PHONE_NUMBER_EXIST_API_OLD,
    RESEND_CODE_API,
} from "./constants";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypePasswordlessEmailDeliveryInput, TypePasswordlessSmsDeliveryInput } from "./types";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import MultiFactorAuthRecipe from "../multifactorauth/recipe";
import MultitenancyRecipe from "../multitenancy/recipe";
import { User } from "../../user";
import { isFakeEmail } from "../thirdparty/utils";
import { FactorIds } from "../multifactorauth";
import { SessionContainerInterface } from "../session/types";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "passwordless";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput>;

    smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput>;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput> | undefined;
            smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput> | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        {
            let builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new EmailDeliveryIngredient(this.config.getEmailDeliveryConfig())
                : ingredients.emailDelivery;

        this.smsDelivery =
            ingredients.smsDelivery === undefined
                ? new SmsDeliveryIngredient(this.config.getSmsDeliveryConfig())
                : ingredients.smsDelivery;

        let allFactors = getEnabledPwlessFactors(this.config);

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mfaInstance = MultiFactorAuthRecipe.getInstance();

            if (mfaInstance !== undefined) {
                mfaInstance.addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes((tenantConfig) => {
                    if (tenantConfig.passwordless.enabled === false) {
                        return [];
                    }
                    return allFactors;
                });
                mfaInstance.addFuncToGetFactorsSetupForUserFromOtherRecipes(async (user: User) => {
                    // We deliberately do not check for matching tenantId because
                    // even if the user is logging into a tenant does not have
                    // passwordless loginMethod, the frontend will call the
                    // same consumeCode API as if there was a passwordless user.
                    // the only diff is that a new recipe user will be associated with the session tenant
                    function isFactorSetupForUser(user: User, factorId: string) {
                        for (const loginMethod of user.loginMethods) {
                            if (loginMethod.recipeId !== Recipe.RECIPE_ID) {
                                continue;
                            }

                            // Notice that we also check for if the email is fake or not,
                            // cause if it is fake, then we should not consider it as setup
                            // so that the frontend asks the user to enter an email,
                            // or uses the email of another login method.
                            if (loginMethod.email !== undefined && !isFakeEmail(loginMethod.email)) {
                                if (factorId === FactorIds.OTP_EMAIL || factorId === FactorIds.LINK_EMAIL) {
                                    return true;
                                }
                            }

                            if (loginMethod.phoneNumber !== undefined) {
                                if (factorId === FactorIds.OTP_PHONE || factorId === FactorIds.LINK_PHONE) {
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
                    let nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined: string[] = [];
                    for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                        // in the if statement below, we also check for if the email
                        // is fake or not cause if it is fake, then we consider that
                        // that login method is not setup for passwordless, and instead
                        // we want to ask the user to enter their email, or to use
                        // another login method that has no fake email.
                        if (orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)
                            ) {
                                // loginmethods for passwordless are guaranteed to have unique emails
                                // across all the loginmethods for a user.
                                nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.push(
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].email!
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
                        let emailsResult: string[] = [];
                        if (sessionLoginMethod!.email !== undefined && !isFakeEmail(sessionLoginMethod!.email)) {
                            emailsResult = [sessionLoginMethod!.email];
                        }

                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)
                            ) {
                                // we have the if check below cause different loginMethods
                                // across different recipes can have the same email.
                                if (!emailsResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)) {
                                    emailsResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!);
                                }
                            }
                        }
                        let factorIdToEmailsMap: Record<string, string[]> = {};
                        if (allFactors.includes(FactorIds.OTP_EMAIL)) {
                            factorIdToEmailsMap[FactorIds.OTP_EMAIL] = emailsResult;
                        }
                        if (allFactors.includes(FactorIds.LINK_EMAIL)) {
                            factorIdToEmailsMap[FactorIds.LINK_EMAIL] = emailsResult;
                        }
                        return {
                            status: "OK",
                            factorIdToEmailsMap,
                        };
                    } else if (nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this email and not others cause we want to
                        // not create more loginMethods with passwordless for the user
                        // object.
                        let factorIdToEmailsMap: Record<string, string[]> = {};
                        if (allFactors.includes(FactorIds.OTP_EMAIL)) {
                            factorIdToEmailsMap[
                                FactorIds.OTP_EMAIL
                            ] = nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        if (allFactors.includes(FactorIds.LINK_EMAIL)) {
                            factorIdToEmailsMap[
                                FactorIds.LINK_EMAIL
                            ] = nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined;
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
                    let emailsResult: string[] = [];
                    if (
                        sessionLoginMethod!.email !== undefined &&
                        nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.includes(sessionLoginMethod!.email)
                    ) {
                        emailsResult = [sessionLoginMethod!.email];
                    }

                    for (let i = 0; i < nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined.length; i++) {
                        if (!emailsResult.includes(nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined[i])) {
                            emailsResult.push(nonFakeEmailsThatPasswordlessLoginMethodOrderedByTimeJoined[i]);
                        }
                    }

                    let factorIdToEmailsMap: Record<string, string[]> = {};
                    if (allFactors.includes(FactorIds.OTP_EMAIL)) {
                        factorIdToEmailsMap[FactorIds.OTP_EMAIL] = emailsResult;
                    }
                    if (allFactors.includes(FactorIds.LINK_EMAIL)) {
                        factorIdToEmailsMap[FactorIds.LINK_EMAIL] = emailsResult;
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
                    let phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined: string[] = [];
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
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber!
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
                        let phonesResult: string[] = [];
                        if (sessionLoginMethod!.phoneNumber !== undefined) {
                            phonesResult = [sessionLoginMethod!.phoneNumber];
                        }

                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber !== undefined) {
                                // we have the if check below cause different loginMethods
                                // across different recipes can have the same phone number.
                                if (
                                    !phonesResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber!)
                                ) {
                                    phonesResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].phoneNumber!);
                                }
                            }
                        }
                        let factorIdToPhoneNumberMap: Record<string, string[]> = {};
                        if (allFactors.includes(FactorIds.OTP_PHONE)) {
                            factorIdToPhoneNumberMap[FactorIds.OTP_PHONE] = phonesResult;
                        }
                        if (allFactors.includes(FactorIds.LINK_PHONE)) {
                            factorIdToPhoneNumberMap[FactorIds.LINK_PHONE] = phonesResult;
                        }
                        return {
                            status: "OK",
                            factorIdToPhoneNumberMap,
                        };
                    } else if (phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this phone number and not others cause we want to
                        // not create more loginMethods with passwordless for the user
                        // object.
                        let factorIdToPhoneNumberMap: Record<string, string[]> = {};
                        if (allFactors.includes(FactorIds.OTP_PHONE)) {
                            factorIdToPhoneNumberMap[
                                FactorIds.OTP_PHONE
                            ] = phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined;
                        }
                        if (allFactors.includes(FactorIds.LINK_PHONE)) {
                            factorIdToPhoneNumberMap[
                                FactorIds.LINK_PHONE
                            ] = phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined;
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
                    let phonesResult: string[] = [];
                    if (
                        sessionLoginMethod!.phoneNumber !== undefined &&
                        phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.includes(
                            sessionLoginMethod!.phoneNumber
                        )
                    ) {
                        phonesResult = [sessionLoginMethod!.phoneNumber];
                    }

                    for (let i = 0; i < phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined.length; i++) {
                        if (!phonesResult.includes(phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined[i])) {
                            phonesResult.push(phoneNumbersThatPasswordlessLoginMethodOrderedByTimeJoined[i]);
                        }
                    }

                    let factorIdToPhoneNumberMap: Record<string, string[]> = {};
                    if (allFactors.includes(FactorIds.OTP_PHONE)) {
                        factorIdToPhoneNumberMap[FactorIds.OTP_PHONE] = phonesResult;
                    }
                    if (allFactors.includes(FactorIds.LINK_PHONE)) {
                        factorIdToPhoneNumberMap[FactorIds.LINK_PHONE] = phonesResult;
                    }
                    return {
                        status: "OK",
                        factorIdToPhoneNumberMap,
                    };
                });
            }

            const mtRecipe = MultitenancyRecipe.getInstance();
            if (mtRecipe !== undefined) {
                for (const factorId of allFactors) {
                    mtRecipe.allAvailableFirstFactors.push(factorId);
                }
            }
        });
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Passwordless.init function?");
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                    smsDelivery: undefined,
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

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                id: CONSUME_CODE_API,
                disabled: this.apiImpl.consumeCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CONSUME_CODE_API),
            },
            {
                id: CREATE_CODE_API,
                disabled: this.apiImpl.createCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(CREATE_CODE_API),
            },
            {
                id: DOES_EMAIL_EXIST_API,
                disabled: this.apiImpl.emailExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_EMAIL_EXIST_API),
            },
            {
                id: DOES_EMAIL_EXIST_API_OLD,
                disabled: this.apiImpl.emailExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_EMAIL_EXIST_API_OLD),
            },
            {
                id: DOES_PHONE_NUMBER_EXIST_API,
                disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_PHONE_NUMBER_EXIST_API),
            },
            {
                id: DOES_PHONE_NUMBER_EXIST_API_OLD,
                disabled: this.apiImpl.phoneNumberExistsGET === undefined,
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(DOES_PHONE_NUMBER_EXIST_API_OLD),
            },
            {
                id: RESEND_CODE_API,
                disabled: this.apiImpl.resendCodePOST === undefined,
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(RESEND_CODE_API),
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
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
        if (id === CONSUME_CODE_API) {
            return await consumeCodeAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === CREATE_CODE_API) {
            return await createCodeAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === DOES_EMAIL_EXIST_API || id === DOES_EMAIL_EXIST_API_OLD) {
            return await emailExistsAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === DOES_PHONE_NUMBER_EXIST_API || id === DOES_PHONE_NUMBER_EXIST_API_OLD) {
            return await phoneNumberExistsAPI(this.apiImpl, tenantId, options, userContext);
        } else {
            return await resendCodeAPI(this.apiImpl, tenantId, options, userContext);
        }
    };

    handleError = async (err: STError, _: BaseRequest, __: BaseResponse): Promise<void> => {
        throw err;
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };

    // helper functions below...

    createMagicLink = async (
        input:
            | {
                  email: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  request: BaseRequest | undefined;
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  request: BaseRequest | undefined;
                  userContext: UserContext;
              }
    ): Promise<string> => {
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
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      userInputCode,
                      session: input.session,
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

    signInUp = async (
        input:
            | {
                  email: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext: UserContext;
              }
    ) => {
        let codeInfo = await this.recipeInterfaceImpl.createCode(
            "email" in input
                ? {
                      email: input.email,
                      tenantId: input.tenantId,
                      session: input.session,
                      userContext: input.userContext,
                  }
                : {
                      phoneNumber: input.phoneNumber,
                      tenantId: input.tenantId,
                      session: input.session,
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
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
                : {
                      preAuthSessionId: codeInfo.preAuthSessionId,
                      deviceId: codeInfo.deviceId,
                      userInputCode: codeInfo.userInputCode,
                      session: input.session,
                      tenantId: input.tenantId,
                      userContext: input.userContext,
                  }
        );

        if (consumeCodeResponse.status === "OK") {
            return {
                status: "OK",
                createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser!,
                recipeUserId: consumeCodeResponse.recipeUserId!,
                user: consumeCodeResponse.user!,
            };
        } else {
            throw new Error("Failed to create user. Please retry");
        }
    };
}
