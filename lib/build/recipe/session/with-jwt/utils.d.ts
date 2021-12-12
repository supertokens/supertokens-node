import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
export declare function addJWTToAccessTokenPayload({
    accessTokenPayload,
    jwtExpiry,
    userId,
    jwtPropertyName,
    openIdRecipeImplementation,
}: {
    accessTokenPayload: any;
    jwtExpiry: number;
    userId: string;
    jwtPropertyName: string;
    openIdRecipeImplementation: OpenIdRecipeInterface;
}): Promise<any>;
