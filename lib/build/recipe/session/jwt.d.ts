// @ts-nocheck
export type ParsedJWTInfo = {
    version: number;
    rawTokenString: string;
    rawPayload: string;
    header: string;
    payload: any;
    signature: string;
    kid: string | undefined;
};
export declare function parseJWTWithoutSignatureVerification(jwt: string): ParsedJWTInfo;
