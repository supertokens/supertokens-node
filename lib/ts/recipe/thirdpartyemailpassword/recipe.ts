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
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailVerificationRecipe from "../emailverification/recipe";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import * as express from "express";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, User } from "./types";
import { validateAndNormaliseUserInput, extractPaginationTokens, combinePaginationResults } from "./utils";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "thirdpartyemailpassword";

    config: TypeNormalisedInput;

    emailVerificationRecipe: EmailVerificationRecipe;

    emailPasswordRecipe: EmailPasswordRecipe;

    thirdPartyRecipe: ThirdPartyRecipe | undefined;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        this.emailPasswordRecipe = new EmailPasswordRecipe(
            recipeId,
            appInfo,
            {
                sessionFeature: {
                    setJwtPayload: async (user, formfields, action) => {
                        return this.config.sessionFeature.setJwtPayload(
                            user,
                            {
                                loginType: "emailpassword",
                                formFields: formfields,
                            },
                            action
                        );
                    },
                    setSessionData: async (user, formfields, action) => {
                        return this.config.sessionFeature.setSessionData(
                            user,
                            {
                                loginType: "emailpassword",
                                formFields: formfields,
                            },
                            action
                        );
                    },
                },
                signUpFeature: {
                    disableDefaultImplementation: this.config.signUpFeature.disableDefaultImplementation,
                    formFields: this.config.signUpFeature.formFields,
                    handleCustomFormFieldsPostSignUp: async (user, formfields) => {
                        return await this.config.signUpFeature.handlePostSignUp(user, {
                            loginType: "emailpassword",
                            formFields: formfields,
                        });
                    },
                },
                signInFeature: {
                    disableDefaultImplementation: this.config.signInFeature.disableDefaultImplementation,
                },
                signOutFeature: {
                    disableDefaultImplementation: this.config.signOutFeature.disableDefaultImplementation,
                },
                resetPasswordUsingTokenFeature: this.config.resetPasswordUsingTokenFeature,
                emailVerificationFeature: {
                    disableDefaultImplementation: true,
                },
            },
            EmailPasswordRecipe.RECIPE_ID
        );

        if (this.config.providers.length !== 0) {
            this.thirdPartyRecipe = new ThirdPartyRecipe(
                recipeId,
                appInfo,
                {
                    sessionFeature: {
                        setJwtPayload: async (user, thirdPartyAuthCodeResponse, action) => {
                            return this.config.sessionFeature.setJwtPayload(
                                user,
                                {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                },
                                action
                            );
                        },
                        setSessionData: async (user, thirdPartyAuthCodeResponse, action) => {
                            return this.config.sessionFeature.setSessionData(
                                user,
                                {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse: thirdPartyAuthCodeResponse,
                                },
                                action
                            );
                        },
                    },
                    signInAndUpFeature: {
                        disableDefaultImplementation:
                            this.config.signInFeature.disableDefaultImplementation ||
                            this.config.signUpFeature.disableDefaultImplementation,
                        providers: this.config.providers,
                        handlePostSignUpIn: async (user, thirdPartyAuthCodeResponse, newUser) => {
                            if (newUser) {
                                return await this.config.signUpFeature.handlePostSignUp(user, {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse,
                                });
                            } else {
                                return await this.config.signInFeature.handlePostSignIn(user, {
                                    loginType: "thirdparty",
                                    thirdPartyAuthCodeResponse,
                                });
                            }
                        },
                    },
                    signOutFeature: {
                        disableDefaultImplementation: true,
                    },
                    emailVerificationFeature: {
                        disableDefaultImplementation: true,
                    },
                },
                ThirdPartyRecipe.RECIPE_ID
            );
        }

        this.emailVerificationRecipe = new EmailVerificationRecipe(
            recipeId,
            appInfo,
            this.config.emailVerificationFeature
        );
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, config);
                return Recipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "ThirdPartyEmailPassword recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    undefined
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
                undefined
            );
        }
        Recipe.instance = undefined;
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
            undefined
        );
    }

    getAPIsHandled = (): APIHandled[] => {
        let apisHandled = [
            ...this.emailPasswordRecipe.getAPIsHandled(),
            ...this.emailVerificationRecipe.getAPIsHandled(),
        ];
        if (this.thirdPartyRecipe !== undefined) {
            apisHandled.push(...this.thirdPartyRecipe.getAPIsHandled());
        }
        return apisHandled;
    };

    handleAPIRequest = async (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => {
        if (this.emailPasswordRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined) {
            return await this.emailPasswordRecipe.handleAPIRequest(id, req, res, next, path, method);
        }
        if (
            this.thirdPartyRecipe !== undefined &&
            this.thirdPartyRecipe.returnAPIIdIfCanHandleRequest(path, method) !== undefined
        ) {
            return await this.thirdPartyRecipe.handleAPIRequest(id, req, res, next, path, method);
        }
        return await this.emailVerificationRecipe.handleAPIRequest(id, req, res, next, path, method);
    };

    handleError = (
        err: STErrorEmailPassword | STErrorThirdParty,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ): void => {
        if (this.emailPasswordRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)) {
            return this.emailPasswordRecipe.handleError(err, request, response, next);
        } else if (
            this.thirdPartyRecipe !== undefined &&
            this.thirdPartyRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)
        ) {
            return this.thirdPartyRecipe.handleError(err, request, response, next);
        }
        return this.emailVerificationRecipe.handleError(err, request, response, next);
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders = [
            ...this.emailVerificationRecipe.getAllCORSHeaders(),
            ...this.emailPasswordRecipe.getAllCORSHeaders(),
        ];
        if (this.thirdPartyRecipe !== undefined) {
            corsHeaders.push(...this.thirdPartyRecipe.getAllCORSHeaders());
        }
        return corsHeaders;
    };

    isErrorFromThisOrChildRecipeBasedOnInstance = (err: any): err is STError => {
        return (
            STError.isErrorFromSuperTokens(err) &&
            (this === err.recipe ||
                this.emailVerificationRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err) ||
                this.emailPasswordRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err) ||
                (this.thirdPartyRecipe !== undefined &&
                    this.thirdPartyRecipe.isErrorFromThisOrChildRecipeBasedOnInstance(err)))
        );
    };

    signUp = async (email: string, password: string): Promise<User> => {
        return this.emailPasswordRecipe.signUp(email, password);
    };

    signIn = async (email: string, password: string): Promise<User> => {
        return this.emailPasswordRecipe.signIn(email, password);
    };

    signInUp = async (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }> => {
        if (this.thirdPartyRecipe === undefined) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("No thirdparty provider configured"),
                },
                this
            );
        }
        return this.thirdPartyRecipe.signInUp(thirdPartyId, thirdPartyUserId, email);
    };

    getUserById = async (userId: string): Promise<User | undefined> => {
        let user: User | undefined = await this.emailPasswordRecipe.getUserById(userId);
        if (user !== undefined) {
            return user;
        }
        if (this.thirdPartyRecipe === undefined) {
            return undefined;
        }
        return await this.thirdPartyRecipe.getUserById(userId);
    };

    getUserByThirdPartyInfo = async (thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> => {
        if (this.thirdPartyRecipe === undefined) {
            return undefined;
        }
        return this.thirdPartyRecipe.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId);
    };

    getEmailForUserId = async (userId: string) => {
        let userInfo = await this.getUserById(userId);
        if (userInfo === undefined) {
            throw new STError(
                {
                    type: STError.UNKNOWN_USER_ID_ERROR,
                    message: "Unknown User ID provided",
                },
                this
            );
        }
        return userInfo.email;
    };

    getUserByEmail = async (email: string): Promise<User | undefined> => {
        return this.emailPasswordRecipe.getUserByEmail(email);
    };

    createResetPasswordToken = async (userId: string): Promise<string> => {
        return this.emailPasswordRecipe.createResetPasswordToken(userId);
    };

    resetPasswordUsingToken = async (token: string, newPassword: string) => {
        return this.emailPasswordRecipe.resetPasswordUsingToken(token, newPassword);
    };

    createEmailVerificationToken = async (userId: string): Promise<string> => {
        return this.emailVerificationRecipe.createEmailVerificationToken(userId, await this.getEmailForUserId(userId));
    };

    verifyEmailUsingToken = async (token: string) => {
        return this.emailVerificationRecipe.verifyEmailUsingToken(token);
    };

    isEmailVerified = async (userId: string) => {
        return this.emailVerificationRecipe.isEmailVerified(userId, await this.getEmailForUserId(userId));
    };

    getUsersOldestFirst = async (limit?: number, nextPaginationTokenString?: string) => {
        limit = limit === undefined ? 100 : limit;
        let nextPaginationTokens: {
            thirdPartyPaginationToken: string | undefined;
            emailPasswordPaginationToken: string | undefined;
        } = {
            thirdPartyPaginationToken: undefined,
            emailPasswordPaginationToken: undefined,
        };
        if (nextPaginationTokenString !== undefined) {
            nextPaginationTokens = extractPaginationTokens(this, nextPaginationTokenString);
        }
        let emailPasswordResultPromise = this.emailPasswordRecipe.getUsersOldestFirst(
            limit,
            nextPaginationTokens.emailPasswordPaginationToken
        );
        let thirdPartyResultPromise =
            this.thirdPartyRecipe === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyRecipe.getUsersOldestFirst(limit, nextPaginationTokens.thirdPartyPaginationToken);
        let emailPasswordResult = await emailPasswordResultPromise;
        let thirdPartyResult = await thirdPartyResultPromise;
        return combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, true);
    };

    getUsersNewestFirst = async (limit?: number, nextPaginationTokenString?: string) => {
        limit = limit === undefined ? 100 : limit;
        let nextPaginationTokens: {
            thirdPartyPaginationToken: string | undefined;
            emailPasswordPaginationToken: string | undefined;
        } = {
            thirdPartyPaginationToken: undefined,
            emailPasswordPaginationToken: undefined,
        };
        if (nextPaginationTokenString !== undefined) {
            nextPaginationTokens = extractPaginationTokens(this, nextPaginationTokenString);
        }
        let emailPasswordResultPromise = this.emailPasswordRecipe.getUsersNewestFirst(
            limit,
            nextPaginationTokens.emailPasswordPaginationToken
        );
        let thirdPartyResultPromise =
            this.thirdPartyRecipe === undefined
                ? {
                      users: [],
                  }
                : this.thirdPartyRecipe.getUsersNewestFirst(limit, nextPaginationTokens.thirdPartyPaginationToken);
        let emailPasswordResult = await emailPasswordResultPromise;
        let thirdPartyResult = await thirdPartyResultPromise;
        return combinePaginationResults(thirdPartyResult, emailPasswordResult, limit, false);
    };

    getUserCount = async () => {
        let promise1 = this.emailPasswordRecipe.getUserCount();
        let promise2 = this.thirdPartyRecipe !== undefined ? this.thirdPartyRecipe.getUserCount() : 0;
        return (await promise1) + (await promise2);
    };
}
