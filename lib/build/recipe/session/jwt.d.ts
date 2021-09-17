// @ts-nocheck
export declare function verifyJWTAndGetPayload(
    jwt: string,
    jwtSigningPublicKey: string
): {
    [key: string]: any;
};
export declare function getPayloadWithoutVerifiying(
    jwt: string
): {
    [key: string]: any;
};
