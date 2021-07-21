import RecipeModule from "../../recipeModule";
import { NormalisedAppinfo, APIHandled, RecipeListFunction, HTTPMethod } from "../../types";
import EmailVerificationRecipe from "../emailverification/recipe";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import { BaseRequest, BaseResponse } from "../../framework";
import STError from "./error";
import { TypeInput, TypeNormalisedInput, User, RecipeInterface, APIInterface } from "./types";
import STErrorEmailPassword from "../emailpassword/error";
import STErrorThirdParty from "../thirdparty/error";
import NormalisedURLPath from "../../normalisedURLPath";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    emailVerificationRecipe: EmailVerificationRecipe;
    private emailPasswordRecipe;
    private thirdPartyRecipe;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        recipes: {
            emailVerificationInstance: EmailVerificationRecipe | undefined;
            thirdPartyInstance: ThirdPartyRecipe | undefined;
            emailPasswordInstance: EmailPasswordRecipe | undefined;
        }
    );
    static init(config: TypeInput): RecipeListFunction;
    static reset(): void;
    static getInstanceOrThrowError(): Recipe;
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        req: BaseRequest,
        res: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STErrorEmailPassword | STErrorThirdParty, request: BaseRequest, response: BaseResponse) => void;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    getEmailForUserId: (userId: string) => Promise<string>;
    createEmailVerificationToken: (userId: string) => Promise<string>;
    verifyEmailUsingToken: (token: string) => Promise<User>;
    isEmailVerified: (userId: string) => Promise<boolean>;
}
