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
import { NormalisedAppinfo, APIHandled, HTTPMethod, RecipeListFunction, UserContext } from "../../types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import {
    SIGN_UP_API,
    SIGN_IN_API,
    GENERATE_PASSWORD_RESET_TOKEN_API,
    PASSWORD_RESET_API,
    SIGNUP_EMAIL_EXISTS_API,
} from "./constants";
import signUpAPI from "./api/signup";
import signInAPI from "./api/signin";
import generatePasswordResetTokenAPI from "./api/generatePasswordResetToken";
import passwordResetAPI from "./api/passwordReset";
import { send200Response } from "../../utils";
import emailExistsAPI from "./api/emailExists";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { Querier } from "../../querier";
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypeEmailPasswordEmailDeliveryInput } from "./types";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import MultiFactorAuthRecipe from "../multifactorauth/recipe";
import MultitenancyRecipe from "../multitenancy/recipe";
import { User } from "../../user";
import { isFakeEmail } from "../thirdparty/utils";
import { FactorIds } from "../multifactorauth";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "emailpassword";

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;

    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput> | undefined;
        }
    ) {
        super(recipeId, appInfo);
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        {
            const getEmailPasswordConfig = () => this.config;
            let builder = new OverrideableBuilder(
                RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId), getEmailPasswordConfig)
            );
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
                ? new EmailDeliveryIngredient(this.config.getEmailDeliveryConfig(this.isInServerlessEnv))
                : ingredients.emailDelivery;

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mfaInstance = MultiFactorAuthRecipe.getInstance();
            if (mfaInstance !== undefined) {
                mfaInstance.addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes((tenantConfig) => {
                    if (tenantConfig.emailPassword.enabled === false) {
                        return [];
                    }
                    return ["emailpassword"];
                });
                mfaInstance.addFuncToGetFactorsSetupForUserFromOtherRecipes(async (user: User) => {
                    for (const loginMethod of user.loginMethods) {
                        // We don't check for tenantId here because if we find the user
                        // with emailpassword loginMethod from different tenant, then
                        // we assume the factor is setup for this user. And as part of factor
                        // completion, we associate that loginMethod with the session's tenantId
                        if (loginMethod.recipeId === Recipe.RECIPE_ID) {
                            return ["emailpassword"];
                        }
                    }
                    return [];
                });

                mfaInstance.addFuncToGetEmailsForFactorFromOtherRecipes((user: User, sessionRecipeUserId) => {
                    // This function is called in the MFA info endpoint API.
                    // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346

                    // preparing some reusable variables for the logic below...
                    let sessionLoginMethod = user.loginMethods.find((lM) => {
                        return lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString();
                    });
                    if (sessionLoginMethod === undefined) {
                        // this can happen maybe cause this login method
                        // was unlinked from the user or deleted entirely...
                        return {
                            status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                        };
                    }

                    // We order the login methods based on timeJoined (oldest first)
                    const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                        return a.timeJoined - b.timeJoined;
                    });
                    // Then we take the ones that belong to this recipe
                    const recipeLoginMethodsOrderedByTimeJoinedOldestFirst = orderedLoginMethodsByTimeJoinedOldestFirst.filter(
                        (lm) => lm.recipeId === Recipe.RECIPE_ID
                    );

                    let result: string[];
                    if (recipeLoginMethodsOrderedByTimeJoinedOldestFirst.length !== 0) {
                        // If there are login methods belonging to this recipe, the factor is set up
                        // In this case we only list email addresses that have a password associated with them
                        result = [
                            // First we take the verified real emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => !isFakeEmail(lm.email!) && lm.verified === true)
                                .map((lm) => lm.email!),
                            // Then we take the non-verified real emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => !isFakeEmail(lm.email!) && lm.verified === false)
                                .map((lm) => lm.email!),
                            // Lastly, fake emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            // We also add these into the list because they already have a password added to them so they can be a valid choice when signing in
                            // We do not want to remove the previously added "MFA password", because a new email password user was linked
                            // E.g.:
                            // 1. A discord user adds a password for MFA (which will use the fake email associated with the discord user)
                            // 2. Later they also sign up and (manually) link a full emailpassword user that they intend to use as a first factor
                            // 3. The next time they sign in using Discord, they could be asked for a secondary password.
                            // In this case, they'd be checked against the first user that they originally created for MFA, not the one later linked to the account
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => isFakeEmail(lm.email!))
                                .map((lm) => lm.email!),
                        ];
                        // We handle moving the session email to the top of the list later
                    } else {
                        // This factor hasn't been set up, we list all emails belonging to the user
                        if (
                            recipeLoginMethodsOrderedByTimeJoinedOldestFirst.some(
                                (lm) => lm.email !== undefined && !isFakeEmail(lm.email)
                            )
                        ) {
                            // If there is at least one real email address linked to the user, we only suggest real addresses
                            result = recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => lm.email !== undefined && !isFakeEmail(lm.email))
                                .map((lm) => lm.email!);
                        } else {
                            // Else we use the fake ones
                            result = recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => lm.email !== undefined && isFakeEmail(lm.email))
                                .map((lm) => lm.email!);
                        }
                        // We handle moving the session email to the top of the list later

                        // Since in this case emails are not guaranteed to be unique, we de-duplicate the results, keeping the oldest one in the list.
                        // The Set constructor keeps the original insertion order (OrderedByTimeJoinedOldestFirst), but de-duplicates the items,
                        // keeping the first one added (so keeping the older one if there are two entries with the same email)
                        // e.g.: [4,2,3,2,1] -> [4,2,3,1]
                        result = Array.from(new Set(result));
                    }

                    // If the loginmethod associated with the session has an email address, we move it to the top of the list (if it's already in the list)
                    if (sessionLoginMethod.email !== undefined && result.includes(sessionLoginMethod.email)) {
                        result = [
                            sessionLoginMethod.email,
                            ...result.filter((email) => email !== sessionLoginMethod!.email),
                        ];
                    }

                    // If the list is empty we generate an email address to make the flow where the user is never asked for
                    // an email address easier to implement. In many cases when the user adds an email-password factor, they
                    // actually only want to add a password and do not care about the associated email address.
                    // Custom implementations can choose to ignore this, and ask the user for the email anyway.
                    if (result.length === 0) {
                        result.push(`${sessionRecipeUserId.getAsString()}@stfakeemail.supertokens.com`);
                    }

                    return {
                        status: "OK",
                        factorIdToEmailsMap: {
                            emailpassword: result,
                        },
                    };
                });
            }

            const mtRecipe = MultitenancyRecipe.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.allAvailableFirstFactors.push(FactorIds.EMAILPASSWORD);
            }
        });
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Emailpassword.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                });

                return Recipe.instance;
            } else {
                throw new Error("Emailpassword recipe has already been initialised. Please check your code for bugs.");
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
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGN_UP_API),
                id: SIGN_UP_API,
                disabled: this.apiImpl.signUpPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGN_IN_API),
                id: SIGN_IN_API,
                disabled: this.apiImpl.signInPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(GENERATE_PASSWORD_RESET_TOKEN_API),
                id: GENERATE_PASSWORD_RESET_TOKEN_API,
                disabled: this.apiImpl.generatePasswordResetTokenPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(PASSWORD_RESET_API),
                id: PASSWORD_RESET_API,
                disabled: this.apiImpl.passwordResetPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGNUP_EMAIL_EXISTS_API),
                id: SIGNUP_EMAIL_EXISTS_API,
                disabled: this.apiImpl.emailExistsGET === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
            emailDelivery: this.emailDelivery,
            appInfo: this.getAppInfo(),
        };
        if (id === SIGN_UP_API) {
            return await signUpAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === SIGN_IN_API) {
            return await signInAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === GENERATE_PASSWORD_RESET_TOKEN_API) {
            return await generatePasswordResetTokenAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === PASSWORD_RESET_API) {
            return await passwordResetAPI(this.apiImpl, tenantId, options, userContext);
        } else if (id === SIGNUP_EMAIL_EXISTS_API) {
            return await emailExistsAPI(this.apiImpl, tenantId, options, userContext);
        }
        return false;
    };

    handleError = async (err: STError, _request: BaseRequest, response: BaseResponse): Promise<void> => {
        if (err.fromRecipe === Recipe.RECIPE_ID) {
            if (err.type === STError.FIELD_ERROR) {
                return send200Response(response, {
                    status: "FIELD_ERROR",
                    formFields: err.payload,
                });
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    };
}
