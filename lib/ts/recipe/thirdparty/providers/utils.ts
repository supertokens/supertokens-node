import * as jose from "jose";

export async function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: jose.JWTVerifyOptions
): Promise<any> {
    const jwks = jose.createRemoteJWKSet(new URL(jwksUri));

    const { payload } = await jose.jwtVerify(idToken, jwks, otherOptions);

    return payload;
}
