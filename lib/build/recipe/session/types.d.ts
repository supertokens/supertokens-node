import { BaseRequest, BaseResponse } from "../../wrappers";
import NormalisedURLPath from "../../normalisedURLPath";
export declare type HandshakeInfo = {
    jwtSigningPublicKey: string;
    antiCsrf: "VIA_TOKEN" | "VIA_CUSTOM_HEADER" | "NONE";
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    accessTokenValidity: number;
    refreshTokenValidity: number;
    signingKeyLastUpdated: number;
};
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
    (message: string, request: BaseRequest, response: BaseResponse): void;
}
export interface TokenTheftErrorHandlerMiddleware {
    (sessionHandle: string, userId: string, request: BaseRequest, response: BaseResponse): void;
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
        res: BaseResponse;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }): Promise<SessionContainerInterface>;
    getSession(input: {
        req: BaseRequest;
        res: BaseResponse;
        options?: VerifySessionOptions;
    }): Promise<SessionContainerInterface | undefined>;
    refreshSession(input: { req: BaseRequest; res: BaseResponse }): Promise<SessionContainerInterface>;
    revokeAllSessionsForUser(input: { userId: string }): Promise<string[]>;
    getAllSessionHandlesForUser(input: { userId: string }): Promise<string[]>;
    revokeSession(input: { sessionHandle: string }): Promise<boolean>;
    revokeMultipleSessions(input: { sessionHandles: string[] }): Promise<string[]>;
    getSessionData(input: { sessionHandle: string }): Promise<any>;
    updateSessionData(input: { sessionHandle: string; newSessionData: any }): Promise<void>;
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
    }): Promise<void>;
}
