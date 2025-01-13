// @ts-nocheck
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, JSONObject, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import {
    APIInterface,
    PayloadBuilderFunction,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
    UserInfo,
    UserInfoBuilderFunction,
} from "./types";
import { User } from "../../user";
export default class Recipe extends RecipeModule {
    static RECIPE_ID: "oauth2provider";
    private static instance;
    private accessTokenBuilders;
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
    addAccessTokenBuilderFromOtherRecipe: (accessTokenBuilders: PayloadBuilderFunction) => void;
    addIdTokenBuilderFromOtherRecipe: (idTokenBuilder: PayloadBuilderFunction) => void;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest: (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError(error: error, _: BaseRequest, __: BaseResponse, _userContext: UserContext): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
    getDefaultAccessTokenPayload(
        user: User,
        scopes: string[],
        sessionHandle: string,
        userContext: UserContext
    ): Promise<JSONObject>;
    getDefaultIdTokenPayload(
        user: User,
        scopes: string[],
        sessionHandle: string,
        userContext: UserContext
    ): Promise<JSONObject>;
    getDefaultUserInfoPayload(
        user: User,
        accessTokenPayload: JSONObject,
        scopes: string[],
        tenantId: string,
        userContext: UserContext
    ): Promise<UserInfo>;
}
