// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
export declare type KeyInfo = {
    publicKey: string;
    expiryTime: number;
    createdAt: number;
};
export declare type AntiCsrfType = "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
export declare type StoredHandshakeInfo = {
    antiCsrf: AntiCsrfType;
    accessTokenBlacklistingEnabled: boolean;
    accessTokenValidity: number;
    refreshTokenValidity: number;
} & (
    | {
          jwtSigningPublicKeyList: KeyInfo[];
      }
    | {
          jwtSigningPublicKeyList: undefined;
          jwtSigningPublicKey: string;
          jwtSigningPublicKeyExpiryTime: number;
      }
);
export declare type CreateOrRefreshAPIResponse = {
    session: {
        handle: string;
        userId: string;
        userDataInJWT: any;
    };
    accessToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    refreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    idRefreshToken: {
        token: string;
        expiry: number;
        createdTime: number;
    };
    antiCsrfToken: string | undefined;
};
export declare const InputSchemaErrorHandlers: {
    type: string;
    properties: {
        onUnauthorised: {
            type: string;
        };
        onTokenTheftDetected: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export interface ErrorHandlers {
    onUnauthorised?: ErrorHandlerMiddleware;
    onTokenTheftDetected?: TokenTheftErrorHandlerMiddleware;
}
export declare type TypeInput = {
    cookieSecure?: boolean;
    cookieSameSite?: "strict" | "lax" | "none";
    sessionExpiredStatusCode?: number;
    cookieDomain?: string;
    errorHandlers?: ErrorHandlers;
    antiCsrf?: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: APIInterface) => APIInterface;
    };
};
export declare const InputSchema: {
    type: string;
    properties: {
        cookieSecure: {
            type: string;
        };
        cookieSameSite: {
            type: string;
        };
        sessionExpiredStatusCode: {
            type: string;
        };
        cookieDomain: {
            type: string;
        };
        errorHandlers: {
            type: string;
            properties: {
                onUnauthorised: {
                    type: string;
                };
                onTokenTheftDetected: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        antiCsrf: {
            type: string;
        };
        override: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export declare type TypeNormalisedInput = {
    refreshTokenPath: NormalisedURLPath;
    cookieDomain: string | undefined;
    cookieSameSite: "strict" | "lax" | "none";
    cookieSecure: boolean;
    sessionExpiredStatusCode: number;
    errorHandlers: NormalisedErrorHandlers;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis: (originalImplementation: APIInterface) => APIInterface;
    };
};
export interface SessionRequest extends BaseRequest {
    session?: SessionContainerInterface;
}
export interface ErrorHandlerMiddleware {
    (message: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: BaseRequest, response: BaseResponse): Promise<void>;
}
export interface NormalisedErrorHandlers {
    onUnauthorised: ErrorHandlerMiddleware;
    onTryRefreshToken: ErrorHandlerMiddleware;
    onTokenTheftDetected: TokenTheftErrorHandlerMiddleware;
}
export interface VerifySessionOptions {
    antiCsrfCheck?: boolean;
    sessionRequired?: boolean;
}
export interface RecipeInterface {
    createNewSession(input: {
        res: any;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface>;
    getSession(input: {
        req: any;
        res: any;
        options?: VerifySessionOptions;
    }): Promise<SessionContainerInterface | undefined>;
    refreshSession(input: { req: any; res: any }): Promise<SessionContainerInterface>;
    /**
     * Used to retrieve all session information for a given session handle. Can be used in place of:
     * - getSessionData
     * - getJWTPayload
     */
    getSessionInformation(input: { sessionHandle: string }): Promise<SessionInformation>;
    revokeAllSessionsForUser(input: { userId: string }): Promise<string[]>;
    getAllSessionHandlesForUser(input: { userId: string }): Promise<string[]>;
    revokeSession(input: { sessionHandle: string }): Promise<boolean>;
    revokeMultipleSessions(input: { sessionHandles: string[] }): Promise<string[]>;
    /** @deprecated Use getSessionInformation instead **/
    getSessionData(input: { sessionHandle: string }): Promise<any>;
    updateSessionData(input: { sessionHandle: string; newSessionData: any }): Promise<void>;
    /** @deprecated Use getSessionInformation instead **/
    getJWTPayload(input: { sessionHandle: string }): Promise<any>;
    updateJWTPayload(input: { sessionHandle: string; newJWTPayload: any }): Promise<void>;
    getAccessTokenLifeTimeMS(): Promise<number>;
    getRefreshTokenLifeTimeMS(): Promise<number>;
}
export interface SessionContainerInterface {
    revokeSession(): Promise<void>;
    getSessionData(): Promise<any>;
    updateSessionData(newSessionData: any): Promise<any>;
    getUserId(): string;
    getJWTPayload(): any;
    getHandle(): string;
    getAccessToken(): string;
    updateJWTPayload(newJWTPayload: any): Promise<void>;
    getTimeCreated(): Promise<number>;
    getExpiry(): Promise<number>;
}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export interface APIInterface {
    refreshPOST: undefined | ((input: { options: APIOptions }) => Promise<void>);
    signOutPOST:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              status: "OK";
          }>);
    verifySession(input: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
    }): Promise<SessionContainerInterface | undefined>;
}
export declare type SessionInformation = {
    sessionHandle: string;
    userId: string;
    sessionData: any;
    expiry: number;
    jwtPayload: any;
    timeCreated: number;
};
