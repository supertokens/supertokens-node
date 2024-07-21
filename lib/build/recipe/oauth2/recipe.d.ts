// @ts-nocheck
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, JSONObject, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import {
    APIInterface,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
    UserInfo,
    UserInfoBuilderFunction,
} from "./types";
import { User } from "../../user";
export default class Recipe extends RecipeModule {
    static RECIPE_ID: string;
    private static instance;
    private idTokenBuilders;
    private userInfoBuilders;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput);
    static getInstance(): Recipe | undefined;
    static getInstanceOrThrowError(): Recipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    addUserInfoBuilderFromOtherRecipe: (userInfoBuilderFn: UserInfoBuilderFunction) => void;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest: (
        id: string,
        _tenantId: string | undefined,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError(error: error, _: BaseRequest, __: BaseResponse, _userContext: UserContext): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
    getDefaultIdTokenPayload(user: User, scopes: string[], userContext: UserContext): Promise<JSONObject>;
    getDefaultUserInfoPayload(
        user: User,
        accessTokenPayload: JSONObject,
        scopes: string[],
        userContext: UserContext
    ): Promise<UserInfo>;
}
