// @ts-nocheck
import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, GetEmailForRecipeUserIdFunc } from "./types";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod, UserContext } from "../../types";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { TypeEmailVerificationEmailDeliveryInput } from "./types";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "emailverification";
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput>;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        ingredients: {
            emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput> | undefined;
        }
    );
    static getInstanceOrThrowError(): Recipe;
    static getInstance(): Recipe | undefined;
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
    getEmailForRecipeUserId: GetEmailForRecipeUserIdFunc;
    getPrimaryUserIdForRecipeUser: (recipeUserId: RecipeUserId, userContext: UserContext) => Promise<string>;
    updateSessionIfRequiredPostEmailVerification: (input: {
        req: BaseRequest;
        res: BaseResponse;
        session: SessionContainerInterface | undefined;
        recipeUserIdWhoseEmailGotVerified: RecipeUserId;
        userContext: UserContext;
    }) => Promise<SessionContainerInterface | undefined>;
}
