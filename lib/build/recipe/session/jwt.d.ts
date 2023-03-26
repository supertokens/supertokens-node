// @ts-nocheck
export declare type ParsedJWTInfo = {
    version: number;
    rawTokenString: string;
    rawPayload: string;
    header: string;
    payload: any;
    signature: string;
};
export declare function parseJWTWithoutSignatureVerification(jwt: string): ParsedJWTInfo;
