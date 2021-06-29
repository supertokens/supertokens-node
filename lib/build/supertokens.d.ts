import { TypeInput, NormalisedAppinfo, HTTPMethod } from "./types";
import RecipeModule from "./recipeModule";
import NormalisedURLPath from "./normalisedURLPath";
import { BaseRequest, BaseResponse } from "./wrappers";
export default class SuperTokens {
    private static instance;
    appInfo: NormalisedAppinfo;
    isInServerlessEnv: boolean;
    recipeModules: RecipeModule[];
    constructor(config: TypeInput);
    sendTelemetry: () => Promise<void>;
    static init(config: TypeInput): void;
    static reset(): void;
    static getInstanceOrThrowError(): SuperTokens;
    handleAPI: (
        matchedRecipe: RecipeModule,
        id: string,
        request: BaseRequest,
        response: BaseResponse,
        path: NormalisedURLPath,
        method: HTTPMethod
    ) => Promise<boolean>;
    getAllCORSHeaders: () => string[];
    getUserCount: (includeRecipeIds?: string[] | undefined) => Promise<number>;
    getUsers: (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number | undefined;
        paginationToken?: string | undefined;
        includeRecipeIds?: string[] | undefined;
    }) => Promise<{
        users: {
            recipeId: string;
            user: any;
        }[];
        nextPaginationToken?: string | undefined;
    }>;
}
