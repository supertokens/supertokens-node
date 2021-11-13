import SessionClass from "../sessionClass";
import { Helpers } from "../recipeImplementation";
import { BaseResponse } from "../../../framework";
import * as SessionFunctions from "../sessionFunctions";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";

export default class SessionClassWithJWT extends SessionClass {
    private jwtRecipeImplementation: JWTRecipeInterface;

    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse,
        jwtRecipeImplementation: JWTRecipeInterface
    ) {
        super(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res);
        this.jwtRecipeImplementation = jwtRecipeImplementation;
    }

    updateAccessTokenPayload = async (newAccessTokenPayload: any) => {
        let sessionInformation = await SessionFunctions.getSessionInformation(this.helpers, this.sessionHandle);
        let existingJWT = sessionInformation.accessTokenPayload.jwt;

        if (existingJWT === undefined) {
            return super.updateAccessTokenPayload(newAccessTokenPayload);
        }

        let currentTimeInSeconds = Date.now() / 1000;
        let existingJWTValidity =
            JSON.parse(Buffer.from(existingJWT.split(".")[1], "base64").toString("utf-8")).exp - currentTimeInSeconds;

        let newJWTResponse = await this.jwtRecipeImplementation.createJWT({
            payload: newAccessTokenPayload,
            validitySeconds: existingJWTValidity,
        });

        if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
            // Should never come here
            throw new Error("JWT Signing algorithm not supported");
        }

        newAccessTokenPayload = {
            ...newAccessTokenPayload,
            jwt: newJWTResponse.jwt,
        };

        return await super.updateAccessTokenPayload({
            newAccessTokenPayload,
        });
    };
}
