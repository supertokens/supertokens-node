// @ts-nocheck
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, TypeNormalisedInput } from "../types";
export default class SessionClassWithJWT implements SessionContainerInterface {
    private jwtRecipeImplementation;
    private originalSessionClass;
    private config;
    constructor(
        originalSessionClass: SessionContainerInterface,
        jwtRecipeImplementation: JWTRecipeInterface,
        config: TypeNormalisedInput
    );
    revokeSession: () => Promise<void>;
    getSessionData: () => Promise<any>;
    updateSessionData: (newSessionData: any) => Promise<any>;
    getUserId: () => string;
    getAccessTokenPayload: () => any;
    getHandle: () => string;
    getAccessToken: () => string;
    getTimeCreated: () => Promise<number>;
    getExpiry: () => Promise<number>;
    updateAccessTokenPayload: (newAccessTokenPayload: any) => Promise<void>;
}
