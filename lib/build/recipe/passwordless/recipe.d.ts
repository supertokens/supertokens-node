// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import { BaseRequest, BaseResponse } from "../../framework";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypePasswordlessEmailDeliveryInput, TypePasswordlessSmsDeliveryInput } from "./types";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput>;
    smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput>;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypePasswordlessEmailDeliveryInput> | undefined;
            smsDelivery: SmsDeliveryIngredient<TypePasswordlessSmsDeliveryInput> | undefined;
        }
    );
    static getInstanceOrThrowError(): Recipe;
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        _: NormalisedURLPath,
        __: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    createMagicLink: (
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) => Promise<string>;
    signInUp: (
        input:
            | {
                  email: string;
                  userContext?: any;
              }
            | {
                  phoneNumber: string;
                  userContext?: any;
              }
    ) => Promise<{
        status: string;
        createdNewUser: boolean;
        user: import("./types").User;
    }>;
}
