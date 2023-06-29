import * as jose from "jose";

export async function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwks: jose.JWTVerifyGetKey,
    otherOptions: jose.JWTVerifyOptions
): Promise<any> {
    const { payload } = await jose.jwtVerify(idToken, jwks, otherOptions);

    return payload;
}
