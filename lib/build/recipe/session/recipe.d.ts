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
import { BaseRequest, BaseResponse } from "../../framework";
import OpenIdRecipe from "../openid/recipe";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    private static claimsAddedByOtherRecipes;
    private static claimValidatorsAddedByOtherRecipes;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    openIdRecipe?: OpenIdRecipe;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    static addClaimFromOtherRecipe: (builder: SessionClaim<any>) => void;
    static getClaimsAddedByOtherRecipes: () => SessionClaim<any>[];
    static addClaimValidatorFromOtherRecipe: (builder: SessionClaimValidator) => void;
    static getClaimValidatorsAddedByOtherRecipes: () => SessionClaimValidator[];
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, request: BaseRequest, response: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    verifySession: (
        options: VerifySessionOptions | undefined,
        request: BaseRequest,
        response: BaseResponse
    ) => Promise<import("./types").SessionContainerInterface | undefined>;
}
