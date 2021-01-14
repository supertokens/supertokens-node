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
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction } from "../../types";
import * as express from "express";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import NormalisedURLPath from "../../normalisedURLPath";
import {
    SIGN_UP_API,
    SIGN_IN_API,
    GENERATE_PASSWORD_RESET_TOKEN_API,
    PASSWORD_RESET_API,
    SIGN_OUT_API,
    SIGNUP_EMAIL_EXISTS_API,
    GENERATE_EMAIL_VERIFY_TOKEN_API,
    EMAIL_VERIFY_API,
} from "./constants";
import {
    signUp as signUpAPIToCore,
    signIn as signInAPIToCore,
    getUserById as getUserByIdFromCore,
    getUserByEmail as getUserByEmailFromCore,
    createResetPasswordToken as createResetPasswordTokenFromCore,
    resetPasswordUsingToken as resetPasswordUsingTokenToCore,
    createEmailVerificationToken as createEmailVerificationTokenFromCore,
    verifyEmailUsingToken as verifyEmailUsingTokenFromCore,
    isEmailVerified as isEmailVerifiedFromCore,
    getUsersCount as getUsersCountCore,
    getUsers as getUsersCore,
} from "./coreAPICalls";
import signUpAPI from "./api/signup";
import signInAPI from "./api/signin";
import generatePasswordResetTokenAPI from "./api/generatePasswordResetToken";
import passwordResetAPI from "./api/passwordReset";
import signOutAPI from "./api/signout";
import { send200Response } from "../../utils";
import emailExistsAPI from "./api/emailExists";
import generateEmailVerifyTokenAPI from "./api/generateEmailVerifyToken";
import emailVerifyAPI from "./api/emailVerify";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "emailpassword";

    config: TypeNormalisedInput;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            Recipe.RECIPE_ID
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Emailpassword recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    Recipe.RECIPE_ID
                );
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                Recipe.RECIPE_ID
            );
        }
        Recipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGN_UP_API),
                id: SIGN_UP_API,
                disabled: this.config.signUpFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGN_IN_API),
                id: SIGN_IN_API,
                disabled: this.config.signInFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), GENERATE_PASSWORD_RESET_TOKEN_API),
                id: GENERATE_PASSWORD_RESET_TOKEN_API,
                disabled: this.config.resetPasswordUsingTokenFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), PASSWORD_RESET_API),
                id: PASSWORD_RESET_API,
                disabled: this.config.resetPasswordUsingTokenFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGN_OUT_API),
                id: SIGN_OUT_API,
                disabled: this.config.signOutFeature.disableDefaultImplementation,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), SIGNUP_EMAIL_EXISTS_API),
                id: SIGNUP_EMAIL_EXISTS_API,
                disabled: this.config.signUpFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), GENERATE_EMAIL_VERIFY_TOKEN_API),
                id: GENERATE_EMAIL_VERIFY_TOKEN_API,
                disabled: this.config.emailVerificationFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.config.emailVerificationFeature.disableDefaultImplementation,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(this.getRecipeId(), EMAIL_VERIFY_API),
                id: EMAIL_VERIFY_API,
                disabled: this.config.emailVerificationFeature.disableDefaultImplementation,
            },
        ];
    };

    handleAPIRequest = async (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (id === SIGN_UP_API) {
            return await signUpAPI(this, req, res, next);
        } else if (id === SIGN_IN_API) {
            return await signInAPI(this, req, res, next);
        } else if (id === GENERATE_PASSWORD_RESET_TOKEN_API) {
            return await generatePasswordResetTokenAPI(this, req, res, next);
        } else if (id === SIGN_OUT_API) {
            return await signOutAPI(this, req, res, next);
        } else if (id === PASSWORD_RESET_API) {
            return await passwordResetAPI(this, req, res, next);
        } else if (id === GENERATE_EMAIL_VERIFY_TOKEN_API) {
            return await generateEmailVerifyTokenAPI(this, req, res, next);
        } else if (id === EMAIL_VERIFY_API) {
            return await emailVerifyAPI(this, req, res, next);
        } else {
            return await emailExistsAPI(this, req, res, next);
        }
    };

    handleError = (
        err: STError,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (err.type === STError.EMAIL_ALREADY_EXISTS_ERROR) {
            // As per point number 3a in https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536
            return this.handleError(
                new STError(
                    {
                        type: STError.FIELD_ERROR,
                        payload: [
                            {
                                id: "email",
                                error: "This email already exists. Please sign in instead.",
                            },
                        ],
                        message: "Error in input formFields",
                    },
                    this.getRecipeId()
                ),
                request,
                response,
                next
            );
        } else if (err.type === STError.WRONG_CREDENTIALS_ERROR) {
            return send200Response(response, {
                status: "WRONG_CREDENTIALS_ERROR",
            });
        } else if (err.type === STError.FIELD_ERROR) {
            return send200Response(response, {
                status: "FIELD_ERROR",
                formFields: err.payload,
            });
        } else if (err.type === STError.RESET_PASSWORD_INVALID_TOKEN_ERROR) {
            return send200Response(response, {
                status: "RESET_PASSWORD_INVALID_TOKEN_ERROR",
            });
        } else if (err.type === STError.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR) {
            return send200Response(response, {
                status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
            });
        } else if (err.type === STError.EMAIL_ALREADY_VERIFIED_ERROR) {
            return send200Response(response, {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            });
        } else {
            return next(err);
        }
    };

    getAllCORSHeaders = (): string[] => {
        return [];
    };

    // instance functions below...............

    signUp = async (email: string, password: string): Promise<User> => {
        return signUpAPIToCore(this, email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return signInAPIToCore(this, email, password);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        return getUserByIdFromCore(this, userId);
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return getUserByEmailFromCore(this, email);
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        return createResetPasswordTokenFromCore(this, userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return resetPasswordUsingTokenToCore(this, token, newPassword);
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return createEmailVerificationTokenFromCore(this, userId);
    };

    verifyEmailUsingToken = async (token: string) => {
        return verifyEmailUsingTokenFromCore(this, token);
    };

    isEmailVerified = async (userId: string) => {
        return isEmailVerifiedFromCore(this, userId);
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this, "ASC", limit, nextPaginationToken);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationToken?: string) => {
        return getUsersCore(this, "DESC", limit, nextPaginationToken);
    };

    getUserCount = async () => {
        return getUsersCountCore(this);
    };
}
