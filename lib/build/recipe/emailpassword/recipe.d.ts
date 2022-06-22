// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, HTTPMethod, RecipeListFunction } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailVerificationRecipe from "../emailverification/recipe";
import { BaseRequest, BaseResponse } from "../../framework";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypeEmailPasswordEmailDeliveryInput } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        recipes: {
            emailVerificationInstance: EmailVerificationRecipe | undefined;
        },
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput> | undefined;
        }
    );
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
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
    getEmailForUserId: (userId: string, userContext: any) => Promise<string>;
}
