export declare type ParsedJWTInfo = {
    rawTokenString: string;
    rawPayload: string;
    header: string;
    payload: any;
    signature: string;
};
export declare function parseJWTWithoutSignatureVerification(jwt: string): ParsedJWTInfo;
export declare function verifyJWT({ header, rawPayload, signature }: ParsedJWTInfo, jwtSigningPublicKey: string): void;
