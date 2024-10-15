// @ts-nocheck
import { TokenTransferMethod } from "./types";
export declare const REFRESH_API_PATH = "/session/refresh";
export declare const SIGNOUT_API_PATH = "/signout";
export declare const SESSIONS_GET_API_PATH = "/sessions";
export declare const SESSION_REVOKE_API_PATH = "/session/revoke";
export declare const availableTokenTransferMethods: TokenTransferMethod[];
export declare const oneYearInMs = 31536000000;
export declare const JWKCacheCooldownInMs = 500;
export declare const protectedProps: string[];
