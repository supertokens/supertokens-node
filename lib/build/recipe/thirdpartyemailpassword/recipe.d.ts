// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import type { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    TypeThirdPartyEmailPasswordEmailDeliveryInput,
} from "./types";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    private emailPasswordRecipe;
    private thirdPartyRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    emailDelivery: EmailDeliveryIngredient<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        recipes: {
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            emailPasswordInstance: EmailPasswordRecipe | undefined;
        },
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeThirdPartyEmailPasswordEmailDeliveryInput> | undefined;
        }
    );
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    static getInstanceOrThrowError(): Recipe;
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
    handleError: (
        err: STErrorEmailPassword | STErrorThirdParty,
        request: BaseRequest,
        response: BaseResponse
    ) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
