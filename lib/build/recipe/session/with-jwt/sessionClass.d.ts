// @ts-nocheck
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface } from "../types";
export default class SessionClassWithJWT implements SessionContainerInterface {
    private jwtRecipeImplementation;
    private originalSessionClass;
    constructor(originalSessionClass: SessionContainerInterface, jwtRecipeImplementation: JWTRecipeInterface);
    revokeSession(): Promise<void>;
    getSessionData(): Promise<any>;
    updateSessionData(newSessionData: any): Promise<any>;
    getUserId(): string;
    getAccessTokenPayload(): any;
    getHandle(): string;
    getAccessToken(): string;
    getTimeCreated(): Promise<number>;
    getExpiry(): Promise<number>;
    updateAccessTokenPayload: (newAccessTokenPayload: any) => Promise<void>;
}
