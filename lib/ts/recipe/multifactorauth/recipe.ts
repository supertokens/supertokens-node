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
import { UPDATE_SESSION_AND_FETCH_MFA_INFO } from "./constants";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import {
    APIInterface,
    GetAllFactorsFromOtherRecipesFunc,
    GetEmailsForFactorFromOtherRecipesFunc,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    GetPhoneNumbersForFactorsFromOtherRecipesFunc,
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
import MultitenancyRecipe from "../multitenancy/recipe";
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

    getEmailsForFactorFromOtherRecipesFunc: GetEmailsForFactorFromOtherRecipesFunc[] = [];
    getPhoneNumbersForFactorFromOtherRecipesFunc: GetPhoneNumbersForFactorsFromOtherRecipesFunc[] = [];

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

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mtRecipe = MultitenancyRecipe.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.staticFirstFactors = this.config.firstFactors;
            }
        });

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
                        MultiFactorAuthClaim.validators.hasCompletedMFARequirementForAuth()
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
                method: "put",
                pathWithoutApiBasePath: new NormalisedURLPath(UPDATE_SESSION_AND_FETCH_MFA_INFO),
                id: UPDATE_SESSION_AND_FETCH_MFA_INFO,
                disabled: this.apiImpl.updateSessionAndFetchMfaInfoPUT === undefined,
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
        if (id === UPDATE_SESSION_AND_FETCH_MFA_INFO) {
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
                  userSigningInForFactor: User;
              }
            | {
                  isAlreadySetup: boolean;
                  signUpInfo?: {
                      email?: string;
                      phoneNumber?: string;
                      isVerifiedFactor: boolean;
                  };
              }
        )
    ): Promise<{ status: "OK" } | { status: "MFA_FLOW_ERROR"; reason: string }> => {
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
                    status: "MFA_FLOW_ERROR",
                    reason: `'${input.factorIdInProgress}' is not a valid first factor`,
                };
            }
            return {
                status: "OK",
            };
        }

        if ("userSigningInForFactor" in input) {
            if (input.userSigningInForFactor.id !== input.session.getUserId()) {
                // here the user logging in is not linked to the session user and
                // we do not allow factor setup for existing users through sign in.
                // we allow factor setup only through sign up

                return {
                    status: "MFA_FLOW_ERROR",
                    reason:
                        "Cannot setup factor because the user already exists and not linked to the session user. Please contact support. (ERR_CODE_011)",
                };
            }

            // we assume factor is already setup because the user logging in is already linked to the session user
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

        // Check if the new user being created can be considered for factor setup for MFA on the following conditions:
        // 1. the new factor is a verified factor or the session user has a login method with same email and is verified
        // 2. linking of the new user with the session user should not fail
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

                if (input.signUpInfo.email !== undefined) {
                    let foundVerifiedEmail = false;
                    for (const lM of sessionUser?.loginMethods) {
                        if (lM.email === input.signUpInfo.email && lM.verified) {
                            foundVerifiedEmail = true;
                            break;
                        }
                    }
                    if (!foundVerifiedEmail) {
                        return {
                            status: "MFA_FLOW_ERROR",
                            reason: "Cannot setup factor because the email is not verified",
                        };
                    }
                }

                if (input.signUpInfo.phoneNumber !== undefined) {
                    let foundVerifiedPhoneNumber = false;
                    for (const lM of sessionUser?.loginMethods) {
                        if (lM.phoneNumber === input.signUpInfo.phoneNumber && lM.verified) {
                            foundVerifiedPhoneNumber = true;
                            break;
                        }
                    }
                    if (!foundVerifiedPhoneNumber) {
                        return {
                            status: "MFA_FLOW_ERROR",
                            reason: "Cannot setup factor as the phone number is not verified",
                        };
                    }
                }
            }

            if (!sessionUser.isPrimaryUser) {
                for (const email of sessionUser.emails) {
                    const users = await listUsersByAccountInfo(
                        input.tenantId,
                        { email: email },
                        undefined,
                        input.userContext
                    );

                    for (const user of users) {
                        if (user.isPrimaryUser) {
                            return {
                                status: "MFA_FLOW_ERROR",
                                reason:
                                    "Cannot setup factor as the session user cannot become a primary user. Please contact support. (ERR_CODE_009)",
                            };
                        }
                    }
                }

                for (const phoneNumber of sessionUser.phoneNumbers) {
                    const users = await listUsersByAccountInfo(
                        input.tenantId,
                        { phoneNumber: phoneNumber },
                        undefined,
                        input.userContext
                    );

                    for (const user of users) {
                        if (user.isPrimaryUser) {
                            return {
                                status: "MFA_FLOW_ERROR",
                                reason:
                                    "Cannot setup factor as the session user cannot become a primary user. Please contact support. (ERR_CODE_009)",
                            };
                        }
                    }
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
                        status: "MFA_FLOW_ERROR",
                        reason:
                            "Cannot setup factor as the account info for factor being setup is already associated with another primary user. Please contact support. (ERR_CODE_010)",
                    };
                }
            }
        }

        // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
        const requiredSecondaryFactorsForUser = await this.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId: sessionUser.id,
            userContext: input.userContext,
        });
        const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            userContext: input.userContext,
        });
        const completedFactorsClaimValue = await input.session.getClaimValue(MultiFactorAuthClaim, input.userContext);
        const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
            user: sessionUser,
            accessTokenPayload: input.session.getAccessTokenPayload(input.userContext),
            tenantId: input.tenantId,
            factorsSetUpForUser,
            requiredSecondaryFactorsForTenant: tenantInfo.requiredSecondaryFactors ?? [],
            requiredSecondaryFactorsForUser,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            userContext: input.userContext,
        });

        const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
            session: input.session,
            factorId: input.factorIdInProgress,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            requiredSecondaryFactorsForTenant: tenantInfo.requiredSecondaryFactors ?? [],
            requiredSecondaryFactorsForUser,
            factorsSetUpForUser,
            mfaRequirementsForAuth,
            userContext: input.userContext,
        });
        if (!canSetup) {
            return {
                status: "MFA_FLOW_ERROR",
                reason: `Cannot setup factor as the user is not allowed to setup this factor: '${input.factorIdInProgress}'`,
            };
        }

        return {
            status: "OK",
        };
    };

    updateSessionAndUserAfterFactorCompletion = async ({
        session,
        isFirstFactor,
        factorId,
        userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor,
        userContext,
    }: {
        session: SessionContainerInterface;
        isFirstFactor: boolean;
        factorId: string;
        userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor?: {
            user: User;
            createdNewUser: boolean;
            recipeUserId: RecipeUserId;
        };
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | { status: "MFA_FLOW_ERROR"; reason: string }
        | { status: "RECURSE_FOR_RACE_CONDITION" }
    > => {
        if (isFirstFactor) {
            await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
                session,
                factorId: factorId,
                userContext,
            });
            return {
                status: "OK",
            };
        }

        // loop to handle race conditions
        const sessionUser = await getUser(session.getUserId(), userContext);

        // race condition, user deleted throw unauthorized
        if (sessionUser === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session user not found",
            });
        }

        if (userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor !== undefined) {
            if (userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.createdNewUser) {
                // This is a newly created user, so it must be account linked with the session user
                if (!sessionUser.isPrimaryUser) {
                    const createPrimaryRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.createPrimaryUser(
                        {
                            recipeUserId: new RecipeUserId(sessionUser.id),
                            userContext,
                        }
                    );
                    if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        this.querier.invalidateCoreCallCache(userContext);
                        return await this.updateSessionAndUserAfterFactorCompletion({
                            session,
                            isFirstFactor,
                            factorId,
                            userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor,
                            userContext,
                        }); // recurse for race condition
                    } else if (
                        createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        this.querier.invalidateCoreCallCache(userContext);
                        return {
                            status: "RECURSE_FOR_RACE_CONDITION",
                        };
                    }
                }

                const linkRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.linkAccounts({
                    recipeUserId: userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.recipeUserId,
                    primaryUserId: sessionUser.id,
                    userContext,
                });

                if (linkRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                    this.querier.invalidateCoreCallCache(userContext);
                    return {
                        status: "RECURSE_FOR_RACE_CONDITION",
                    };
                } else if (linkRes.status === "INPUT_USER_IS_NOT_A_PRIMARY_USER") {
                    this.querier.invalidateCoreCallCache(userContext);
                    return await this.updateSessionAndUserAfterFactorCompletion({
                        session,
                        isFirstFactor,
                        factorId,
                        userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor,
                        userContext,
                    }); // recurse for race condition
                } else if (linkRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                    this.querier.invalidateCoreCallCache(userContext);
                    return {
                        status: "RECURSE_FOR_RACE_CONDITION",
                    };
                }
            } else {
                // Not a new user we should check if the user is linked to the session user
                const loggedInUserLinkedToSessionUser =
                    sessionUser.id === userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor.user.id;
                if (!loggedInUserLinkedToSessionUser) {
                    return {
                        status: "MFA_FLOW_ERROR",
                        reason:
                            "Cannot setup factor because the user already exists and not linked to the session user. Please contact support. (ERR_CODE_011)",
                    };
                }
            }
        }

        await this.recipeInterfaceImpl.markFactorAsCompleteInSession({
            session: session,
            factorId: factorId,
            userContext,
        });

        return {
            status: "OK",
        };
    };

    addGetEmailsForFactorFromOtherRecipes = (func: GetEmailsForFactorFromOtherRecipesFunc) => {
        this.getEmailsForFactorFromOtherRecipesFunc.push(func);
    };

    getEmailsForFactors = (user: User, sessionRecipeUserId: RecipeUserId): Record<string, string[] | undefined> => {
        let result = {};

        for (const func of this.getEmailsForFactorFromOtherRecipesFunc) {
            result = {
                ...result,
                ...func(user, sessionRecipeUserId),
            };
        }
        return result;
    };

    addGetPhoneNumbersForFactorsFromOtherRecipes = (func: GetPhoneNumbersForFactorsFromOtherRecipesFunc) => {
        this.getPhoneNumbersForFactorFromOtherRecipesFunc.push(func);
    };

    getPhoneNumbersForFactors = (
        user: User,
        sessionRecipeUserId: RecipeUserId
    ): Record<string, string[] | undefined> => {
        let result = {};

        for (const func of this.getPhoneNumbersForFactorFromOtherRecipesFunc) {
            result = {
                ...result,
                ...func(user, sessionRecipeUserId),
            };
        }

        return result;
    };
}
