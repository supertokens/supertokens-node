export declare function verifyJWTAndGetPayload(
    jwt: string,
    jwtSigningPublicKey: string
): {
    verified: boolean;
    payload: {
        [key: string]: any;
    };
};
