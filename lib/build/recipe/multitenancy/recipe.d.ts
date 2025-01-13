// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import STError from "../../error";
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import { ProviderInput } from "../thirdparty/types";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "multitenancy";
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    staticThirdPartyProviders: ProviderInput[];
    allAvailableFirstFactors: string[];
    staticFirstFactors: string[] | undefined;
    getAllowedDomainsForTenantId?: (tenantId: string, userContext: UserContext) => Promise<string[] | undefined>;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstanceOrThrowError(): Recipe;
    static getInstance(): Recipe | undefined;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
