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
import { listUsersByAccountInfo } from "../..";
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

    checkForValidFirstFactor = async (tenantId: string, factorId: string, userContext: UserContext): Promise<void> => {
        const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
        if (tenantInfo === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Tenant not found",
            });
        }
        const { status: _, ...tenantConfig } = tenantInfo;

        // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
        // if validFirstFactors is undefined, we assume it's valid
        // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
        // so we don't need to do additional checks here
        let validFirstFactors = tenantConfig.firstFactors ?? this.config.firstFactors;

        if (validFirstFactors !== undefined && !validFirstFactors.includes(factorId)) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session is required for secondary factors",
                payload: {
                    clearTokens: false,
                },
            });
        }
    };

    checkIfFactorUserLinkedToSessionUser = (
        sessionUser: User,
        factorUser: User
    ): { status: "OK" } | { status: "VALIDATION_ERROR"; reason: string } => {
        // this is called during sign in operations to ensure the secondary factor user is linked to the session user
        // we disallow factor setup by sign in, and is allowed only via sign up
        if (sessionUser.id !== factorUser.id) {
            return {
                status: "VALIDATION_ERROR",
                reason:
                    "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
            };
        }

        return {
            status: "OK",
        };
    };

    isAllowedToSetupFactor = async (
        tenantId: string,
        session: SessionContainerInterface,
        sessionUser: User,
        factorId: string,
        userContext: UserContext
    ): Promise<{ status: "OK" } | { status: "FACTOR_SETUP_NOT_ALLOWED_ERROR"; reason: string }> => {
        // this is a utility function that populates all the necessary info for the recipe function
        const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
        if (tenantInfo === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Tenant not found",
            });
        }

        const requiredSecondaryFactorsForUser = await this.recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId: sessionUser.id,
            userContext: userContext,
        });
        const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            userContext: userContext,
        });
        const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
        const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
            user: sessionUser,
            accessTokenPayload: session.getAccessTokenPayload(userContext),
            tenantId: tenantId,
            factorsSetUpForUser,
            requiredSecondaryFactorsForTenant: tenantInfo.requiredSecondaryFactors ?? [],
            requiredSecondaryFactorsForUser,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            userContext: userContext,
        });

        const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
            session: session,
            factorId: factorId,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            requiredSecondaryFactorsForTenant: tenantInfo.requiredSecondaryFactors ?? [],
            requiredSecondaryFactorsForUser,
            factorsSetUpForUser,
            mfaRequirementsForAuth,
            userContext: userContext,
        });
        if (!canSetup.isAllowed) {
            return {
                status: "FACTOR_SETUP_NOT_ALLOWED_ERROR",
                reason: canSetup.reason,
            };
        }

        return {
            status: "OK",
        };
    };

    checkFactorUserAccountInfoForVerification = (
        sessionUser: User,
        accountInfo: { email?: string; phoneNumber?: string }
    ): { status: "OK" } | { status: "VALIDATION_ERROR"; reason: string } => {
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

        // we allow setup of unverified account info only if the session user has the same account info
        // and it is verified

        if (accountInfo.email !== undefined) {
            let foundVerifiedEmail = false;
            for (const lM of sessionUser?.loginMethods) {
                if (lM.email === accountInfo.email && lM.verified) {
                    foundVerifiedEmail = true;
                    break;
                }
            }
            if (!foundVerifiedEmail) {
                return {
                    status: "VALIDATION_ERROR",
                    reason:
                        "The factor setup is not allowed because the email is not verified. Please contact support. (ERR_CODE_010)",
                };
            }
        }

        if (accountInfo.phoneNumber !== undefined) {
            let foundVerifiedPhoneNumber = false;
            for (const lM of sessionUser?.loginMethods) {
                if (lM.phoneNumber === accountInfo.phoneNumber) {
                    foundVerifiedPhoneNumber = true;
                    break;
                }
            }
            if (!foundVerifiedPhoneNumber) {
                throw new Error("should never happen"); // phone number only comes from passwordless and is a verified factor always
            }
        }

        return {
            status: "OK",
        };
    };

    checkIfFactorUserCanBeLinkedWithSessionUser = async (
        tenantId: string,
        sessionUser: User,
        accountInfo: { email?: string; phoneNumber?: string },
        userContext: UserContext
    ): Promise<{ status: "OK" | "RECURSE_FOR_RACE" } | { status: "VALIDATION_ERROR"; reason: string }> => {
        if (!sessionUser.isPrimaryUser) {
            const canCreatePrimary = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
                recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                userContext,
            });

            if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                // Race condition since we just checked that it was not a primary user
                this.querier.invalidateCoreCallCache(userContext);
                return {
                    status: "RECURSE_FOR_RACE",
                };
            }

            if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                return {
                    status: "VALIDATION_ERROR",
                    reason:
                        "Cannot setup factor because there is another account with same email or phone number as the currently session user. Please contact support. (ERR_CODE_011)",
                };
            }
        }

        // Check if there if the linking with session user going to fail and avoid user creation here
        const users = await listUsersByAccountInfo(
            tenantId,
            { email: accountInfo.email, phoneNumber: accountInfo.phoneNumber },
            true,
            userContext
        );
        for (const user of users) {
            if (user.isPrimaryUser && user.id !== sessionUser.id) {
                return {
                    status: "VALIDATION_ERROR",
                    reason:
                        "Cannot setup factor because there is another account with same email or phone number of the factor being setup. Please contact support. (ERR_CODE_012)",
                };
            }
        }

        return {
            status: "OK",
        };
    };

    linkAccountsForFactorSetup = async (
        sessionUser: User,
        factorUserRecipeUserId: RecipeUserId,
        userContext: UserContext
    ): Promise<{ status: "OK" | "RECURSE_FOR_RACE" }> => {
        // if we are here, it means that all the validations passed in the first place. So any error
        // in this function must result in retry.

        if (!sessionUser.isPrimaryUser) {
            const createPrimaryRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.createPrimaryUser({
                recipeUserId: new RecipeUserId(sessionUser.id),
                userContext,
            });
            if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                this.querier.invalidateCoreCallCache(userContext);
                return {
                    status: "RECURSE_FOR_RACE",
                };
            } else if (
                createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
            ) {
                this.querier.invalidateCoreCallCache(userContext);
                return {
                    status: "RECURSE_FOR_RACE",
                };
            }
        }

        const linkRes = await AccountLinkingRecipe.getInstance().recipeInterfaceImpl.linkAccounts({
            recipeUserId: factorUserRecipeUserId,
            primaryUserId: sessionUser.id,
            userContext,
        });

        if (linkRes.status !== "OK") {
            this.querier.invalidateCoreCallCache(userContext);
            return {
                status: "RECURSE_FOR_RACE",
            };
        }

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
