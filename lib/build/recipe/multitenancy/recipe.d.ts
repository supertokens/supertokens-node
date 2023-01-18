// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from "../../types";
import { ProviderInput } from "../thirdparty/types";
import { APIInterface, GetTenantIdForUserId, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    staticThirdPartyProviders: ProviderInput[];
    getTenantIdForUserId: GetTenantIdForUserId;
    getAllowedDomainsForTenantId?: (
        tenantId: string | undefined,
        userContext: any
    ) => Promise<{
        status: "OK";
        domains: string[];
    }>;
    getTenantIdForUserIdFuncsFromOtherRecipes: GetTenantIdForUserId[];
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static getInstance(): Recipe | undefined;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, req: BaseRequest, res: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    addGetTenantIdForUserIdFunc: (func: GetTenantIdForUserId) => void;
}
