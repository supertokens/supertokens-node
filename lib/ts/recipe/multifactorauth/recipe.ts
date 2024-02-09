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
import { RESYNC_SESSION_AND_FETCH_MFA_INFO } from "./constants";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import {
    APIInterface,
    FactorIds,
    GetAllAvailableSecondaryFactorIdsFromOtherRecipesFunc,
    GetEmailsForFactorFromOtherRecipesFunc,
    GetFactorsSetupForUserFromOtherRecipesFunc,
    GetPhoneNumbersForFactorsFromOtherRecipesFunc,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
} from "./types";
import { getMFARelatedInfoFromSession, validateAndNormaliseUserInput } from "./utils";
import resyncSessionAndFetchMFAInfoAPI from "./api/resyncSessionAndFetchMFAInfo";
import SessionRecipe from "../session/recipe";
import { PostSuperTokensInitCallbacks } from "../../postSuperTokensInitCallbacks";
import { User } from "../../user";
import RecipeUserId from "../../recipeUserId";
import MultitenancyRecipe from "../multitenancy/recipe";
import { Querier } from "../../querier";
import { TenantConfig } from "../multitenancy/types";
import { AccountInfo } from "../accountlinking/types";
import { SessionContainerInterface } from "../session/types";
import { logDebugMessage } from "../../logger";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "multifactorauth";

    getFactorsSetupForUserFromOtherRecipesFuncs: GetFactorsSetupForUserFromOtherRecipesFunc[] = [];
    getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs: GetAllAvailableSecondaryFactorIdsFromOtherRecipesFunc[] = [];

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

            // We don't add MultiFactorAuthClaim as a global claim because the values are populated
            // on factor setup / completion any way (in the sign in / up APIs).
            // SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(MultiFactorAuthClaim);

            SessionRecipe.getInstanceOrThrowError().addClaimValidatorFromOtherRecipe(
                MultiFactorAuthClaim.validators.hasCompletedMFARequirementsForAuth()
            );
        });

        this.querier = Querier.getNewInstanceOrThrowError(recipeId);
    }

    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the MultiFactorAuth.init function?");
    }

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
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
                pathWithoutApiBasePath: new NormalisedURLPath(RESYNC_SESSION_AND_FETCH_MFA_INFO),
                id: RESYNC_SESSION_AND_FETCH_MFA_INFO,
                disabled: this.apiImpl.resyncSessionAndFetchMFAInfoPUT === undefined,
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
        if (id === RESYNC_SESSION_AND_FETCH_MFA_INFO) {
            return await resyncSessionAndFetchMFAInfoAPI(this.apiImpl, options, userContext);
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

    addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes = (
        f: GetAllAvailableSecondaryFactorIdsFromOtherRecipesFunc
    ) => {
        this.getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs.push(f);
    };

    getAllAvailableSecondaryFactorIds = (tenantConfig: TenantConfig) => {
        let factorIds: string[] = [];
        for (const func of this.getAllAvailableSecondaryFactorIdsFromOtherRecipesFuncs) {
            const factorIdsRes = func(tenantConfig);
            for (const factorId of factorIdsRes) {
                if (!factorIds.includes(factorId)) {
                    factorIds.push(factorId);
                }
            }
        }
        return factorIds;
    };

    addFuncToGetFactorsSetupForUserFromOtherRecipes = (func: GetFactorsSetupForUserFromOtherRecipesFunc) => {
        this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
    };

    addFuncToGetEmailsForFactorFromOtherRecipes = (func: GetEmailsForFactorFromOtherRecipesFunc) => {
        this.getEmailsForFactorFromOtherRecipesFunc.push(func);
    };

    getEmailsForFactors = (
        user: User,
        sessionRecipeUserId: RecipeUserId
    ):
        | { status: "OK"; factorIdToEmailsMap: Record<string, string[]> }
        | { status: "UNKNOWN_SESSION_RECIPE_USER_ID" } => {
        let result: { status: "OK"; factorIdToEmailsMap: Record<string, string[]> } = {
            status: "OK",
            factorIdToEmailsMap: {},
        };

        for (const func of this.getEmailsForFactorFromOtherRecipesFunc) {
            let funcResult = func(user, sessionRecipeUserId);
            if (funcResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID") {
                return {
                    status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                };
            }
            result.factorIdToEmailsMap = {
                ...result.factorIdToEmailsMap,
                ...funcResult.factorIdToEmailsMap,
            };
        }
        return result;
    };

    addFuncToGetPhoneNumbersForFactorsFromOtherRecipes = (func: GetPhoneNumbersForFactorsFromOtherRecipesFunc) => {
        this.getPhoneNumbersForFactorFromOtherRecipesFunc.push(func);
    };

    getPhoneNumbersForFactors = (
        user: User,
        sessionRecipeUserId: RecipeUserId
    ):
        | { status: "OK"; factorIdToPhoneNumberMap: Record<string, string[]> }
        | { status: "UNKNOWN_SESSION_RECIPE_USER_ID" } => {
        let result: { status: "OK"; factorIdToPhoneNumberMap: Record<string, string[]> } = {
            status: "OK",
            factorIdToPhoneNumberMap: {},
        };

        for (const func of this.getPhoneNumbersForFactorFromOtherRecipesFunc) {
            let funcResult = func(user, sessionRecipeUserId);
            if (funcResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID") {
                return {
                    status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                };
            }
            result.factorIdToPhoneNumberMap = {
                ...result.factorIdToPhoneNumberMap,
                ...funcResult.factorIdToPhoneNumberMap,
            };
        }
        return result;
    };

    async checkIfLinkingAllowed(
        session: SessionContainerInterface,
        user: User,
        factorIds: string[],
        accountInfo: AccountInfo,
        userContext: UserContext
    ) {
        logDebugMessage("checkIfLinkingAllowed called");
        let caughtSetupFactorError;
        const mfaInfo = await getMFARelatedInfoFromSession({
            session,
            userContext,
        });
        const validFactorIds = [];
        // In all apis besides passwordless createCode, we know exactly which factor we are signing into, so in those cases,
        // this is basically just checking if the single factor is allowed to be setup or not.
        // For createCode (if the FE didn't pass the factor id exactly, which it should for MFA),
        // we filter whatever is allowed. If any of them are allowed, createCode can happen.
        // The filtered list can be used to select email templates. As an example:
        // If the flowType for passwordless is USER_INPUT_CODE_AND_MAGIC_LINK and but only the otp-email factor is allowed to be set up
        // then we do not want to include a link in the email.
        for (const id of factorIds) {
            // TODO: move this into PWLess
            if ([FactorIds.LINK_EMAIL, FactorIds.LINK_PHONE, FactorIds.OTP_EMAIL, FactorIds.OTP_PHONE].includes(id)) {
                if (
                    user.loginMethods.some(
                        (lm) => lm.hasSameEmailAs(accountInfo.email) || lm.hasSamePhoneNumberAs(accountInfo.phoneNumber)
                    )
                ) {
                    logDebugMessage(
                        `checkIfLinkingAllowed ${id} valid because of this is a passwordless factor and the session user already has this email/phone`
                    );
                    validFactorIds.push(id);
                    continue;
                }
            }
            logDebugMessage(`checkIfLinkingAllowed checking assertAllowedToSetupFactorElseThrowInvalidClaimError`);
            try {
                await this.recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                    session,
                    factorId: id,
                    mfaRequirementsForAuth: mfaInfo.mfaRequirementsForAuth,
                    factorsSetUpForUser: mfaInfo.factorsSetUpForUser,
                    userContext,
                });
                logDebugMessage(
                    `checkIfLinkingAllowed ${id} valid because assertAllowedToSetupFactorElseThrowInvalidClaimError passed`
                );
                // we add it to the valid factor ids list since it is either already set up or allowed to be set up
                validFactorIds.push(id);
            } catch (err) {
                logDebugMessage(
                    `checkIfLinkingAllowed assertAllowedToSetupFactorElseThrowInvalidClaimError failed for ${id}`
                );
                caughtSetupFactorError = err;
            }
        }
        if (validFactorIds.length === 0) {
            logDebugMessage(
                `checkIfLinkingAllowed rethrowing error from assertAllowedToSetupFactorElseThrowInvalidClaimError because we found no valid factors`
            );
            // we can safely re-throw this since this should be an InvalidClaimError
            // if it's anything else, we do not really have a way of handling it anyway.
            throw caughtSetupFactorError;
        }
        return validFactorIds;
    }
}
