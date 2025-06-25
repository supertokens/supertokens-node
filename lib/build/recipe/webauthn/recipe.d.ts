// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, HTTPMethod, RecipeListFunction, UserContext } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypeWebauthnEmailDeliveryInput } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "webauthn";
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    emailDelivery: EmailDeliveryIngredient<TypeWebauthnEmailDeliveryInput>;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput | undefined,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeWebauthnEmailDeliveryInput> | undefined;
        }
    );
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (err: STError, _request: BaseRequest, _response: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
