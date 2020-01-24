"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const HEADER = Buffer.from(
    JSON.stringify({
        alg: "RS256",
        typ: "JWT",
        version: "1"
    })
).toString("base64");
function verifyJWTAndGetPayload(jwt, jwtSigningPublicKey) {
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
    //convert the jwtSigningPublicKey into .pem format
    verifier.update(HEADER + "." + payload);
    if (!verifier.verify(jwtSigningPublicKey, splittedInput[2], "base64")) {
        throw new Error("JWT verification failed");
    }
    // sending payload
    payload = Buffer.from(payload, "base64").toString();
    return JSON.parse(payload);
}
exports.verifyJWTAndGetPayload = verifyJWTAndGetPayload;
//# sourceMappingURL=jwt.js.map
