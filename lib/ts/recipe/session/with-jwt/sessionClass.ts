import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, TypeNormalisedInput } from "../types";

export default class SessionClassWithJWT implements SessionContainerInterface {
    private jwtRecipeImplementation: JWTRecipeInterface;
    private originalSessionClass: SessionContainerInterface;
    private config: TypeNormalisedInput;

    constructor(
        originalSessionClass: SessionContainerInterface,
        jwtRecipeImplementation: JWTRecipeInterface,
        config: TypeNormalisedInput
    ) {
        this.jwtRecipeImplementation = jwtRecipeImplementation;
        this.originalSessionClass = originalSessionClass;
        this.config = config;
    }
    revokeSession(): Promise<void> {
        return this.originalSessionClass.revokeSession();
    }
    getSessionData(): Promise<any> {
        return this.originalSessionClass.getSessionData();
    }
    updateSessionData(newSessionData: any): Promise<any> {
        return this.originalSessionClass.updateSessionData(newSessionData);
    }
    getUserId(): string {
        return this.originalSessionClass.getUserId();
    }
    getAccessTokenPayload() {
        return this.originalSessionClass.getAccessTokenPayload();
    }
    getHandle(): string {
        return this.originalSessionClass.getHandle();
    }
    getAccessToken(): string {
        return this.originalSessionClass.getAccessToken();
    }
    getTimeCreated(): Promise<number> {
        return this.originalSessionClass.getTimeCreated();
    }
    getExpiry(): Promise<number> {
        return this.originalSessionClass.getExpiry();
    }

    updateAccessTokenPayload = async (newAccessTokenPayload: any): Promise<void> => {
        let existingJWT = this.getAccessTokenPayload()[this.config.jwtKey];

        if (existingJWT === undefined) {
            return this.originalSessionClass.updateAccessTokenPayload(newAccessTokenPayload);
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
            [this.config.jwtKey]: newJWTResponse.jwt,
        };

        return await this.originalSessionClass.updateAccessTokenPayload({
            newAccessTokenPayload,
        });
    };
}
