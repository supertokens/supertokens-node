// @ts-nocheck
import RecipeModule from "../../recipeModule";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    VerifySessionOptions,
    SessionClaimValidator,
    SessionClaim,
} from "./types";
import STError from "./error";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import OpenIdRecipe from "../openid/recipe";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    private claimsAddedByOtherRecipes;
    private claimValidatorsAddedByOtherRecipes;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    openIdRecipe: OpenIdRecipe;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    addClaimFromOtherRecipe: (claim: SessionClaim<any>) => void;
    getClaimsAddedByOtherRecipes: () => SessionClaim<any>[];
    addClaimValidatorFromOtherRecipe: (builder: SessionClaimValidator) => void;
    getClaimValidatorsAddedByOtherRecipes: () => SessionClaimValidator[];
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: any
    ) => Promise<boolean>;
    handleError: (err: STError, request: BaseRequest, response: BaseResponse, userContext: any) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    verifySession: (
        options: VerifySessionOptions | undefined,
        request: BaseRequest,
        response: BaseResponse,
        userContext: any
    ) => Promise<import("./types").SessionContainerInterface | undefined>;
}
