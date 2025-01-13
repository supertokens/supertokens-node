// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod, UserContext } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypePasswordlessEmailDeliveryInput, TypePasswordlessSmsDeliveryInput } from "./types";
import SmsDeliveryIngredient from "../../ingredients/smsdelivery";
import { SessionContainerInterface } from "../session/types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "passwordless";
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
    createMagicLink: (
        input:
            | {
                  email: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  request: BaseRequest | undefined;
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  request: BaseRequest | undefined;
                  userContext: UserContext;
              }
    ) => Promise<string>;
    signInUp: (
        input:
            | {
                  email: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  session?: SessionContainerInterface;
                  userContext: UserContext;
              }
    ) => Promise<{
        status: string;
        createdNewRecipeUser: boolean;
        recipeUserId: import("../..").RecipeUserId;
        user: import("../../types").User;
    }>;
}
