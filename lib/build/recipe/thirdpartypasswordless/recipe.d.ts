// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import PasswordlessRecipe from "../passwordless/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import type { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    TypeThirdPartyPasswordlessEmailDeliveryInput,
    TypeThirdPartyPasswordlessSmsDeliveryInput,
} from "./types";
import STErrorPasswordless from "../passwordless/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    passwordlessRecipe: PasswordlessRecipe;
    private thirdPartyRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    emailDelivery: EmailDeliveryIngredient<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    smsDelivery: SmsDeliveryIngredient<TypeThirdPartyPasswordlessSmsDeliveryInput>;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            passwordlessInstance: PasswordlessRecipe | undefined;
        },
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeThirdPartyPasswordlessEmailDeliveryInput> | undefined;
            smsDelivery: SmsDeliveryIngredient<TypeThirdPartyPasswordlessSmsDeliveryInput> | undefined;
        }
    );
    static init(config: TypeInput): RecipeListFunction;
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
        err: STErrorPasswordless | STErrorThirdParty,
        request: BaseRequest,
        response: BaseResponse
    ) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
