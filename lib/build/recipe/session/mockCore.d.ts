// @ts-nocheck
export declare function mockGetRefreshAPIResponse(requestBody: any, querier: any): Promise<any>;
export declare function mockCreateNewSession(requestBody: any, querier: any): Promise<any>;
export declare function mockGetSession(requestBody: any, querier: any): Promise<any>;
export declare function mockRegenerateSession(
    accessToken: string,
    newAccessTokenPayload: any,
    querier: any
): Promise<any>;
