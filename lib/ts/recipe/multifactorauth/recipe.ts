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

import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { GET_MFA_INFO } from "./constants";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import {
    APIInterface,
    GetAllFactorsFromOtherRecipesFunc,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    MFAFlowErrors,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import mfaInfoAPI from "./api/mfaInfo";
import SessionRecipe from "../session/recipe";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import { User } from "../../user";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
import Multitenancy from "../multitenancy";
import Session from "../session";
import AccountLinkingRecipe from "../accountlinking/recipe";
import { getUser, listUsersByAccountInfo } from "../..";
import { Querier } from "../../querier";
import SessionError from "../session/error";
import { TenantConfig } from "../multitenancy/types";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "multifactorauth";

    getFactorsSetupForUserFromOtherRecipesFuncs: GetFactorsSetupForUserFromOtherRecipesFunc[] = [];
    getAllFactorsFromOtherRecipesFunc: GetAllFactorsFromOtherRecipesFunc[] = [];

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    querier: Querier;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(RecipeImplementation(this));
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }

        {
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }

        this.querier = Querier.getNewInstanceOrThrowError(recipeId);
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);

                // We do not want to add the MFA claim as a global claim (which would make createNewSession set it up)
                // because we want to add it in the sign-in APIs manually.

                PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    SessionRecipe.getInstanceOrThrowError().addClaimValidatorFromOtherRecipe(
                        MultiFactorAuthClaim.validators.hasCompletedDefaultFactors()
                    );
                });
                return Recipe.instance;
            } else {
                throw new Error(
                    "MultiFactorAuth recipe has already been initialised. Please check your code for bugs."
                );
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
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(GET_MFA_INFO),
                id: GET_MFA_INFO,
                disabled: this.apiImpl.mfaInfoGET === undefined,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options = {
            recipeInstance: this,
            recipeImplementation: this.recipeInterfaceImpl,
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            req,
            res,
        };
        if (id === GET_MFA_INFO) {
            return await mfaInfoAPI(this.apiImpl, options, userContext);
        }
        throw new Error("should never come here");
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

    addGetAllFactorsFromOtherRecipesFunc = (f: GetAllFactorsFromOtherRecipesFunc) => {
        this.getAllFactorsFromOtherRecipesFunc.push(f);
    };

    getAllAvailableFactorIds = (tenantConfig: TenantConfig) => {
        let factorIds: string[] = [];
        for (const func of this.getAllFactorsFromOtherRecipesFunc) {
            const factorIdsRes = func(tenantConfig);
            for (const factorId of factorIdsRes.factorIds) {
                if (!factorIds.includes(factorId)) {
                    factorIds.push(factorId);
                }
            }
        }
        return factorIds;
    };

    getAllAvailableFirstFactorIds = (tenantConfig: TenantConfig) => {
        let factorIds: string[] = [];
        for (const func of this.getAllFactorsFromOtherRecipesFunc) {
            const factorIdsRes = func(tenantConfig);
            for (const factorId of factorIdsRes.firstFactorIds) {
                if (!factorIds.includes(factorId)) {
                    factorIds.push(factorId);
                }
            }
        }
        return factorIds;
    };

    addGetFactorsSetupForUserFromOtherRecipes = (func: GetFactorsSetupForUserFromOtherRecipesFunc) => {
        this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
    };

    validateForMultifactorAuthBeforeFactorCompletion = async (
        input: {
            tenantId: string;
            factorIdInProgress: string;
            session?: SessionContainerInterface;
            userContext: UserContext;
        } & (
            | {
                  userLoggingIn: User;
              }
            | {
                  isAlreadySetup: boolean;
                  signUpInfo?: {
                      email: string;
                      isVerifiedFactor: boolean;
                  };
              }
        )
    ): Promise<{ status: "OK" } | MFAFlowErrors> => {
        const tenantInfo = await Multitenancy.getTenant(input.tenantId, input.userContext);
        if (tenantInfo === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Tenant not found",
            });
        }
        const { status: _, ...tenantConfig } = tenantInfo;

        let validFirstFactors;

        if (tenantConfig.firstFactors !== undefined) {
            validFirstFactors = tenantConfig.firstFactors; // First Priority, first factors configured for tenant
        } else if (this.config.firstFactors !== undefined) {
            validFirstFactors = this.config.firstFactors; // Second Priority, first factors configured in the recipe
        } else {
            validFirstFactors = this.getAllAvailableFirstFactorIds(tenantConfig); // Last Priority, first factors based on initialised recipes
        }

        if (input.session === undefined) {
            // No session exists, so we need to check if it's a valid first factor before proceeding
            if (!validFirstFactors.includes(input.factorIdInProgress)) {
                return {
                    status: "DISALLOWED_FIRST_FACTOR_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }

        if ("userLoggingIn" in input) {
            if (input.userLoggingIn.id !== input.session.getUserId()) {
                // the user trying to login is not linked to the session user, based on session behaviour
                // we just return OK and do nothing or replace replace the existing session with a new one
                // we are doing this because we allow factor setup only when creating a new user

                // this can happen when you got into login screen with an existing session and tried to log in with a different credentials
                // or a case while doing secondary factor for phone otp but the user created a different account with the same phone number
                return {
                    status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                    message:
                        "Cannot setup factor because the user already exists and not linked to the session user. Please contact support. (ERR_CODE_013)",
                };
            }

            // User already linked means the factor is already setup, no more checks required
            return {
                status: "OK",
            };
        }

        let sessionUser = await getUser(input.session.getUserId(), input.userContext);

        if (!sessionUser) {
            // Session user doesn't exist, maybe the user was deleted
            // Race condition, user got deleted in parallel, throw unauthorized
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session user not found",
            });
        }

        if (input.isAlreadySetup) {
            return {
                status: "OK",
            };
        }

        // Check if the new user being created can be linked via MFA on the following conditions:
        // 1. the new factor is a verified factor
        // 2. the session user has a login method with same email and is verified
        if (input.signUpInfo !== undefined) {
            if (!input.signUpInfo.isVerifiedFactor) {
                /*
                    We discussed another method but did not go ahead with it, details below:

                    We can allow the second factor to be linked to first factor even if the emails are different 
                    and not verified as long as there is no other user that exists (recipe or primary) that has the 
                    same email as that of the second factor. For example, if first factor is google login with e1 
                    and second factor is email password with e2, we allow linking them as long as there is no other 
                    user with email e2.

                    We rejected this idea cause if auto account linking is switched off, then someone else can sign up 
                    with google using e2. This is OK as it would not link (since account linking is switched off). 
                    But, then if account linking is switched on, then the google sign in (and not sign up) with e2 
                    would actually cause it to be linked with the e1 account.
                */

                let foundVerifiedEmail = false;
                for (const lM of sessionUser?.loginMethods) {
                    if (lM.email === input.signUpInfo.email && lM.verified) {
                        foundVerifiedEmail = true;
                        break;
                    }
                }
                if (!foundVerifiedEmail) {
                    return {
                        status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                        message: "Cannot setup factor as the email is not verified",
                    };
                }
            }

            // Check if there if the linking with session user going to fail and avoid user creation here
            const users = await listUsersByAccountInfo(
                input.tenantId,
                { email: input.signUpInfo.email },
                undefined,
                input.userContext
            );
            for (const user of users) {
                if (user.isPrimaryUser && user.id !== sessionUser.id) {
                    return {
                        status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                        message:
                            "Cannot setup factor as the email is already associated with another primary user. Please contact support. (ERR_CODE_012)",
                    };
                }
            }
        }

        // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
        const defaultRequiredFactorIdsForUser = await this.recipeInterfaceImpl.getDefaultRequiredFactorsForUser({
            user: sessionUser,
            tenantId: input.tenantId,
            userContext: input.userContext,
        });
        const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            tenantId: input.tenantId,
            userContext: input.userContext,
        });
        const completedFactorsClaimValue = await input.session.getClaimValue(MultiFactorAuthClaim, input.userContext);
        const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
            user: sessionUser,
            accessTokenPayload: input.session.getAccessTokenPayload(input.userContext),
            tenantId: input.tenantId,
            factorsSetUpForUser,
            defaultRequiredFactorIdsForTenant: tenantInfo.defaultRequiredFactorIds ?? [],
            defaultRequiredFactorIdsForUser,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            userContext: input.userContext,
        });

        const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
            session: input.session,
            factorId: input.factorIdInProgress,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            defaultRequiredFactorIdsForTenant: tenantInfo.defaultRequiredFactorIds ?? [],
            defaultRequiredFactorIdsForUser,
            factorsSetUpForUser,
            mfaRequirementsForAuth,
            userContext: input.userContext,
        });
        if (!canSetup) {
            return {
                status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
            };
        }

        return {
            status: "OK",
        };
    };

    createOrUpdateSessionForMultifactorAuthAfterFactorCompletion = async ({
        req,
        res,
        tenantId,
        factorIdInProgress,
        justCompletedFactorUserInfo,
        userContext,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        isAlreadySetup?: boolean;
        justCompletedFactorUserInfo?: {
            user: User;
            createdNewUser: boolean;
            recipeUserId: RecipeUserId;
        };
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              session: SessionContainerInterface;
          }
        | MFAFlowErrors
    > => {
        let session = await Session.getSession(req, res, {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        });
        if (
            session === undefined // no session exists, so we can create a new one
        ) {
            if (justCompletedFactorUserInfo === undefined) {
                throw new Error("should never come here"); // We wouldn't create new session from a recipe like TOTP
            }

            const newSession = await Session.createNewSession(
                req,
                res,
                tenantId,
                justCompletedFactorUserInfo.recipeUserId,
                {},
                {},
                userContext
            );
            await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                session: newSession,
                factorId: factorIdInProgress,
                userContext,
            });
            return {
                status: "OK",
                session: newSession,
            };
        }

        while (true) {
            // loop to handle race conditions
            const sessionUser = await getUser(session.getUserId(), userContext);

            // race condition, user deleted throw unauthorized
            if (sessionUser === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }

            if (justCompletedFactorUserInfo !== undefined) {
                if (justCompletedFactorUserInfo.createdNewUser) {
                    // This is a newly created user, so it must be account linked with the session user
                    if (!sessionUser.isPrimaryUser) {
                        const createPrimaryRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.createPrimaryUser(
                            {
                                recipeUserId: new RecipeUserId(sessionUser.id),
                                userContext,
                            }
                        );
                        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                            // Race condition
                            this.querier.invalidateCoreCallCache(userContext);
                            continue;
                        } else if (
                            createPrimaryRes.status ===
                            "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        ) {
                            return {
                                status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                                message: "Error setting up MFA for the user. Please contact support. (ERR_CODE_009)",
                            };
                        }
                    }

                    const linkRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.linkAccounts({
                        recipeUserId: justCompletedFactorUserInfo.recipeUserId,
                        primaryUserId: sessionUser.id,
                        userContext,
                    });

                    if (linkRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                        return {
                            status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                            message:
                                "Error setting up MFA for the user because of the automatic account linking. Please contact support. (ERR_CODE_011)",
                        };
                    } else if (linkRes.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                        // Race condition
                        this.querier.invalidateCoreCallCache(userContext);
                        continue;
                    } else if (
                        linkRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        return {
                            status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
                            message:
                                "Cannot complete factor setup as the account info is already associated with another primary user. Please contact support. (ERR_CODE_010)",
                        };
                    }
                } else {
                    // Not a new user we should check if the user is linked to the session user
                    const loggedInUserLinkedToSessionUser = sessionUser.id === justCompletedFactorUserInfo.user.id;
                    if (!loggedInUserLinkedToSessionUser) {
                        return {
                            status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                            message:
                                "Cannot setup factor because the user already exists and not linked to the session user. Please contact support. (ERR_CODE_013)",
                        };
                    }
                }
            }

            break;
        }

        await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
            session: session,
            factorId: factorIdInProgress,
            userContext,
        });

        return {
            status: "OK",
            session: session,
        };
    };
}
