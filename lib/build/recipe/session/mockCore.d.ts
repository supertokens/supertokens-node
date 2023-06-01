// @ts-nocheck
import { Querier } from "../../querier";
export declare function mockGetRefreshAPIResponse(requestBody: any, querier: any): Promise<any>;
export declare function mockCreateNewSession(requestBody: any, querier: any): Promise<any>;
export declare function mockAccessTokenPayload(payload: any): any;
export declare function mockGetSession(requestBody: any, querier: any): Promise<any>;
export declare function mockGetSessionInformation(sessionHandle: string, querier: any): Promise<any>;
export declare function mockRegenerateSession(
    accessToken: string,
    newAccessTokenPayload: any,
    querier: any
): Promise<any>;
export declare function mockGetAllSessionHandlesForUser(input: {
    userId: string;
    fetchSessionsForAllLinkedAccounts: boolean;
}): Promise<string[]>;
export declare function mockRevokeAllSessionsForUser(input: {
    userId: string;
    revokeSessionsForLinkedAccounts: boolean;
    querier: Querier;
}): Promise<string[]>;
export declare function mockUpdateAccessTokenPayload(
    sessionHandle: string,
    newAccessTokenPayload: any,
    querier: Querier
): Promise<boolean>;
