// @ts-nocheck
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as OpenIdRecipeInterface } from "../../openid/types";
export declare function addJWTToAccessTokenPayload({
    accessTokenPayload,
    jwtExpiry,
    userId,
    jwtPropertyName,
    appInfo,
    openIdRecipeImplementation,
}: {
    accessTokenPayload: any;
    jwtExpiry: number;
    userId: string;
    jwtPropertyName: string;
    appInfo: NormalisedAppinfo;
    openIdRecipeImplementation: OpenIdRecipeInterface;
}): Promise<any>;
