import * as crypto from "crypto";

const HEADER = Buffer.from(
    JSON.stringify({
        alg: "RS256",
        typ: "JWT",
        version: "1"
    })
).toString("base64");

export function verifyJWTAndGetPayload(jwt: string, jwtSigningPublicKey: string): { [key: string]: any } {
    const splittedInput = jwt.split(".");
    if (splittedInput.length !== 3) {
        throw new Error("Invalid JWT");
    }

    // checking header
    if (splittedInput[0] !== HEADER) {
        throw new Error("JWT header mismatch");
    }

    let payload = splittedInput[1];

    let verifier = crypto.createVerify("sha256");
    //convert the jwtSigningPublicKey into .pem format RSA-SHA256

    verifier.update(HEADER + "." + payload);
    if (
        !verifier.verify(
            "-----BEGIN PUBLIC KEY-----\n" + jwtSigningPublicKey + "\n-----END PUBLIC KEY-----",
            splittedInput[2],
            "base64"
        )
    ) {
        throw new Error("JWT verification failed");
    }
    // sending payload
    payload = Buffer.from(payload, "base64").toString();
    return JSON.parse(payload);
}
