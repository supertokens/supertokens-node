// @ts-nocheck
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
export declare function addJWTToAccessTokenPayload({
    accessTokenPayload,
    jwtExpiry,
    userId,
    jwtPropertyName,
    openIdRecipeImplementation,
    userContext,
}: {
    accessTokenPayload: any;
    jwtExpiry: number;
    userId: string;
    jwtPropertyName: string;
    openIdRecipeImplementation: OpenIdRecipeInterface;
    userContext: any;
}): Promise<any>;
