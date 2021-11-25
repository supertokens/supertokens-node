// @ts-nocheck
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
export declare function modifyAccessTokenPayload({
    accessTokenPayload,
    jwtExpiry,
    userId,
    jwtPropertyName,
    appInfo,
    jwtRecipeImplementation,
}: {
    accessTokenPayload: any;
    jwtExpiry: number;
    userId: string;
    jwtPropertyName: string;
    appInfo: NormalisedAppinfo;
    jwtRecipeImplementation: JWTRecipeInterface;
}): Promise<any>;
