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
import { User } from "../../user";
import { isFakeEmail } from "../thirdparty/utils";

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
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                });

                PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    const mfaInstance = MultiFactorAuthRecipe.getInstance();
                    if (mfaInstance !== undefined) {
                        mfaInstance.addGetAllFactorsFromOtherRecipesFunc((tenantConfig) => {
                            if (tenantConfig.emailPassword.enabled === false) {
                                return [];
                            }
                            return ["emailpassword"];
                        });
                        mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(async (tenantId: string, user: User) => {
                            for (const loginMethod of user.loginMethods) {
                                // Here we check for matching tenantId because if we don't then
                                // things can go wrong in the following scenario:
                                // - tenant1 -> emailpassword with email e1
                                // - tenant2 -> thirdparty with email e2 (e2 can be equal to e1, doesn't matter)
                                // now if the user has logged into tenant2, and is adding
                                // a password to that, we do return ["emailpassword"]
                                // cause it's there in tenant1 (i.e. we do not check
                                // for tenant below), then the frontend will end up
                                // calling the signIn API instead of signUp, and since
                                // these APIs are tenant specific, then it will return
                                // wrong credentials error even if the password is correct.

                                // Notice that we also check for if the email is fake or not,
                                // cause if it is fake, then we should not consider it as setup
                                // so that the frontend asks the user to enter an email,
                                // or uses the email of another login method.
                                if (
                                    loginMethod.recipeId === Recipe.RECIPE_ID &&
                                    loginMethod.tenantIds.includes(tenantId) &&
                                    !isFakeEmail(loginMethod.email!)
                                ) {
                                    return ["emailpassword"];
                                }
                            }
                            return [];
                        });

                        mfaInstance.addGetEmailsForFactorFromOtherRecipes((user: User, sessionRecipeUserId) => {
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

                            const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                                return a.timeJoined - b.timeJoined;
                            });

                            // MAIN LOGIC FOR THE FUNCTION STARTS HERE
                            let nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined: string[] = [];
                            for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                                // in the if statement below, we also check for if the email
                                // is fake or not cause if it is fake, then we consider that
                                // that login method is not setup for emailpassword, and instead
                                // we want to ask the user to enter their email, or to use
                                // another login method that has no fake email.
                                if (
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID &&
                                    !isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)
                                ) {
                                    // each emailpassword loginMethod for a user
                                    // is guaranteed to have an email field and
                                    // that is unique across other emailpassword loginMethods
                                    // for this user.
                                    nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.push(
                                        orderedLoginMethodsByTimeJoinedOldestFirst[i].email!
                                    );
                                }
                            }

                            if (nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length === 0) {
                                // this means that this factor is not setup.
                                // However, we still check if there is an email for this user
                                // from other loginMethods, and return those. The frontend
                                // will then call the signUp API eventually.

                                // first we check if the session loginMethod has an email
                                // and return that. Cause if it does, then the UX will be good
                                // in that the user will set a password for the the email
                                // they used to login into the current session.

                                // when constructing the emails array, we prioritize
                                // the session user's email cause it's a better UX
                                // for setting or asking for the password for the same email
                                // that the user used to login.
                                let emailsResult: string[] = [];
                                if (sessionLoginMethod.email !== undefined && !isFakeEmail(sessionLoginMethod.email)) {
                                    emailsResult = [sessionLoginMethod.email];
                                }

                                for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                                    if (
                                        orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                        !isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)
                                    ) {
                                        // we have the if check below cause different loginMethods
                                        // across different recipes can have the same email.
                                        if (
                                            !emailsResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!)
                                        ) {
                                            emailsResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].email!);
                                        }
                                    }
                                }
                                return {
                                    status: "OK",
                                    factorIdToEmailsMap: {
                                        emailpassword: emailsResult,
                                    },
                                };
                            } else if (nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length === 1) {
                                // we return just this email cause if this emailpassword
                                // user is from the same tenant that the user is logging into,
                                // then they have to use this since new factor setup won't
                                // be allowed. Even if this emailpassword user is not from
                                // the same tenant as the user's session, we still return just
                                // this cause that way we still just have one emailpassword
                                // loginMethod for this user, just across different tenants.
                                return {
                                    status: "OK",
                                    factorIdToEmailsMap: {
                                        emailpassword: nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined,
                                    },
                                };
                            }

                            // Finally, we return all emails that have emailpassword login
                            // method for this user, but keep the session's email first
                            // if the session's email is in the list of
                            // nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined (for better UX)
                            let emailsResult: string[] = [];
                            if (
                                sessionLoginMethod.email !== undefined &&
                                nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.includes(
                                    sessionLoginMethod.email
                                )
                            ) {
                                emailsResult = [sessionLoginMethod.email];
                            }

                            for (
                                let i = 0;
                                i < nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length;
                                i++
                            ) {
                                if (
                                    !emailsResult.includes(
                                        nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined[i]
                                    )
                                ) {
                                    emailsResult.push(
                                        nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined[i]
                                    );
                                }
                            }

                            return {
                                status: "OK",
                                factorIdToEmailsMap: {
                                    emailpassword: emailsResult,
                                },
                            };
                        });
                    }
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
