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
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import { GET_MFA_INFO } from "./constants";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import {
    APIInterface,
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
import { getUser } from "../..";
import { Querier } from "../../querier";
import { TenantConfig } from "../multitenancy/types";
import SessionError from "../session/error";

export default class Recipe extends RecipeModule {
    private static instance: Recipe | undefined = undefined;
    static RECIPE_ID = "multifactorauth";

    private getFactorsSetupForUserFromOtherRecipesFuncs: GetFactorsSetupForUserFromOtherRecipesFunc[] = [];

    private allAvailableFactorIds: string[] = [];
    private allAvailableFirstFactorIds: string[] = [];

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
        userContext: Record<string, any>
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

    addAvailableFactorIdsFromOtherRecipes = (factorIds: string[], firstFactorIds: string[]) => {
        this.allAvailableFactorIds = this.allAvailableFactorIds.concat(factorIds);
        this.allAvailableFirstFactorIds = this.allAvailableFirstFactorIds.concat(firstFactorIds);
    };

    getAllAvailableFactorIds = () => {
        return this.allAvailableFactorIds;
    };

    getAllAvailableFirstFactorIds = () => {
        return this.allAvailableFirstFactorIds;
    };

    addGetFactorsSetupForUserFromOtherRecipes = (func: GetFactorsSetupForUserFromOtherRecipesFunc) => {
        this.getFactorsSetupForUserFromOtherRecipesFuncs.push(func);
    };

    getFactorsSetupForUser = async (user: User, tenantConfig: TenantConfig, userContext: Record<string, any>) => {
        let factorIds: string[] = [];

        for (const func of this.getFactorsSetupForUserFromOtherRecipesFuncs) {
            let result = await func(user, tenantConfig, userContext);
            if (result !== undefined) {
                factorIds = factorIds.concat(result);
            }
        }
        return factorIds;
    };

    validateForMultifactorAuthBeforeFactorCompletion = async ({
        tenantId,
        factorIdInProgress,
        session,
        userLoggingIn,
        isAlreadySetup,
        userContext,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        tenantId: string;
        factorIdInProgress: string;
        session?: SessionContainerInterface;
        userLoggingIn?: User;
        isAlreadySetup?: boolean;
        userContext: Record<string, any>;
    }): Promise<{ status: "OK" } | MFAFlowErrors> => {
        const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
        const validFirstFactors =
            tenantInfo?.firstFactors || this.config.firstFactors || this.getAllAvailableFirstFactorIds();

        if (session === undefined) {
            // No session exists, so we need to check if it's a valid first factor before proceeding
            if (!validFirstFactors.includes(factorIdInProgress)) {
                return {
                    status: "DISALLOWED_FIRST_FACTOR_ERROR",
                };
            }
            return {
                status: "OK",
            };
        }

        let sessionUser;
        if (userLoggingIn) {
            if (userLoggingIn.id !== session.getUserId()) {
                // the user trying to login is not linked to the session user, based on session behaviour
                // we just return OK and do nothing or replace replace the existing session with a new one
                // we are doing this because we allow factor setup only when creating a new user

                // this can happen when you got into login screen with an existing session and tried to log in with a different credentials
                // or a case while doing secondary factor for phone otp but the user created a different account with the same phone number
                return {
                    status: "OK",
                };
            }
            sessionUser = userLoggingIn;
        } else {
            sessionUser = await getUser(session.getUserId(), userContext);
        }

        if (!sessionUser) {
            // Session user doesn't exist, maybe the user was deleted
            // Race condition, user got deleted in parallel, throw unauthorized
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session user not found",
            });
        }

        if (isAlreadySetup) {
            return {
                status: "OK",
            };
        }

        // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
        const defaultRequiredFactorIdsForUser = await this.recipeInterfaceImpl.getDefaultRequiredFactorsForUser({
            user: sessionUser,
            tenantId,
            userContext,
        });
        const factorsSetUpForUser = await this.recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            tenantId,
            userContext,
        });
        const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
        const mfaRequirementsForAuth = await this.recipeInterfaceImpl.getMFARequirementsForAuth({
            user: sessionUser,
            accessTokenPayload: session.getAccessTokenPayload(),
            tenantId,
            factorsSetUpForUser,
            defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
            defaultRequiredFactorIdsForUser,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            userContext,
        });

        const canSetup = await this.recipeInterfaceImpl.isAllowedToSetupFactor({
            session,
            factorId: factorIdInProgress,
            completedFactors: completedFactorsClaimValue?.c ?? {},
            defaultRequiredFactorIdsForTenant: tenantInfo?.defaultRequiredFactorIds ?? [],
            defaultRequiredFactorIdsForUser,
            factorsSetUpForUser,
            mfaRequirementsForAuth,
            userContext,
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
        userContext: Record<string, any>;
    }): Promise<
        | {
              status: "OK";
              session: SessionContainerInterface;
          }
        | MFAFlowErrors
    > => {
        let session = await Session.getSession(req, res, { sessionRequired: false });
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
                                message: "Error setting up MFA for the user. Please contact support. (ERR_CODE_011)",
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
                                "Error setting up MFA for the user because of the automatic account linking. Please contact support. (ERR_CODE_013)",
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
                                "Cannot complete factor setup as the account info is already associated with another primary user. Please contact support. (ERR_CODE_012)",
                        };
                    }
                } else {
                    // Not a new user we should check if the user is linked to the session user
                    const loggedInUserLinkedToSessionUser = sessionUser.id === justCompletedFactorUserInfo.user.id;
                    if (!loggedInUserLinkedToSessionUser) {
                        // we may keep or replace the session as per the flag overwriteSessionDuringSignIn in session recipe
                        session = await Session.createNewOrKeepExistingSession(
                            req,
                            res,
                            tenantId,
                            justCompletedFactorUserInfo.recipeUserId,
                            {},
                            {},
                            userContext
                        );

                        return {
                            status: "OK",
                            session: session,
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
