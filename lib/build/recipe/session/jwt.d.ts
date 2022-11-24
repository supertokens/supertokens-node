// @ts-nocheck
export declare type ParsedJWTInfo = {
    rawTokenString: string;
    header: string;
    payload: any;
    signature: string;
};
export declare function parseJWTWithoutSignatureVerification(jwt: string): ParsedJWTInfo;
export declare function verifyJWT(
    { header, payload, signature }: ParsedJWTInfo,
    jwtSigningPublicKey: string
): {
    [key: string]: any;
};
