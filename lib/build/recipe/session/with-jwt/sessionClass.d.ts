// @ts-nocheck
import { NormalisedAppinfo } from "../../../types";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, TypeNormalisedInput } from "../types";
export default class SessionClassWithJWT implements SessionContainerInterface {
    private jwtRecipeImplementation;
    private originalSessionClass;
    private config;
    private appInfo;
    constructor(
        originalSessionClass: SessionContainerInterface,
        jwtRecipeImplementation: JWTRecipeInterface,
        config: TypeNormalisedInput,
        appInfo: NormalisedAppinfo
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
