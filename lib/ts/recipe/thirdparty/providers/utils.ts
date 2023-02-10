import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export async function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: jwt.VerifyOptions
): Promise<any> {
    const client = jwksClient({
        jwksUri,
    });
    function getKey(header: any, callback: any) {
        client.getSigningKey(header.kid, function (_, key: any) {
            var signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        });
    }

    let payload: any = await new Promise((resolve, reject) => {
        jwt.verify(idToken, getKey, otherOptions, function (err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });

    return payload;
}
