// @ts-nocheck
import { TokenTransferMethod } from "./types";
export declare const REFRESH_API_PATH = "/session/refresh";
export declare const SIGNOUT_API_PATH = "/signout";
export declare const availableTokenTransferMethods: TokenTransferMethod[];
export declare const oneYearInMs = 31536000000;
export declare const JWKCacheCooldownInMs = 500;
export declare const protectedProps: string[];
export declare const authorizationHeaderKey = "authorization";
export declare const accessTokenHeaderKey = "st-access-token";
export declare const accessTokenCookieKey = "sAccessToken";
export declare const refreshTokenCookieKey = "sRefreshToken";
export declare const refreshTokenHeaderKey = "st-refresh-token";
export declare const antiCsrfHeaderKey = "anti-csrf";
export declare const frontTokenHeaderKey = "front-token";
export declare const authModeHeaderKey = "st-auth-mode";
