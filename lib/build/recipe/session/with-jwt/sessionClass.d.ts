// @ts-nocheck
import SessionClass from "../sessionClass";
import { Helpers } from "../recipeImplementation";
import { BaseResponse } from "../../../framework";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
export default class SessionClassWithJWT extends SessionClass {
    private jwtRecipeImplementation;
    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse,
        jwtRecipeImplementation: JWTRecipeInterface
    );
    updateAccessTokenPayload: (newAccessTokenPayload: any) => Promise<void>;
}
