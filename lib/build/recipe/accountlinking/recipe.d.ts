// @ts-nocheck
import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type {
    AccountInfoWithRecipeId,
    APIHandled,
    HTTPMethod,
    NormalisedAppinfo,
    RecipeListFunction,
} from "../../types";
import { SessionContainer } from "../session";
import type { AccountInfoAndEmailWithRecipeId, TypeNormalisedInput, RecipeInterface, TypeInput } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    isInServerlessEnv: boolean;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config: TypeInput,
        _recipes: {},
        _ingredients: {}
    );
    static init(config: TypeInput): RecipeListFunction;
    static getInstanceOrThrowError(): Recipe;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest(
        _id: string,
        _req: BaseRequest,
        _response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean>;
    handleError(error: error, _request: BaseRequest, _response: BaseResponse): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
    isSignUpAllowed: (input: { info: AccountInfoWithRecipeId }) => Promise<boolean>;
    createPrimaryUserIdOrLinkAccountPostSignUp: (_input: {
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
        shouldRequireVerification: boolean;
    }) => Promise<void>;
    accountLinkPostSignInViaSession: (_input: {
        session: SessionContainer;
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
    }) => Promise<
        | {
              createRecipeUser: true;
          }
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: true;
          })
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: false;
              reason: string;
          })
    >;
}
