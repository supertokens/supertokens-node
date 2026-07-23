const crypto = require("crypto");

/**
 * A minimal software WebAuthn authenticator with full control over the
 * signature counter (signCount) — unlike the wasm helper in getWebAuthnLib.js,
 * which keeps the counter at 0 and therefore never trips the core's
 * clone-detection check (WebAuthn L3 §7.2 step 24).
 *
 * Produces `fmt: "none"` attestations, which the core accepts because it
 * verifies with webauthn4j's non-strict manager.
 */

// --- minimal CBOR encoder (only the subset needed for attestation objects) ---

function cborHead(major, n) {
    if (n < 24) return Buffer.from([(major << 5) | n]);
    if (n < 0x100) return Buffer.from([(major << 5) | 24, n]);
    if (n < 0x10000) {
        const b = Buffer.alloc(3);
        b[0] = (major << 5) | 25;
        b.writeUInt16BE(n, 1);
        return b;
    }
    const b = Buffer.alloc(5);
    b[0] = (major << 5) | 26;
    b.writeUInt32BE(n, 1);
    return b;
}

// value: number (int) | string | Buffer | Array of [key, value] pairs (map)
function cborEncode(value) {
    if (typeof value === "number") {
        if (!Number.isInteger(value)) throw new Error("only integers supported");
        return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
    }
    if (typeof value === "string") {
        const utf8 = Buffer.from(value, "utf8");
        return Buffer.concat([cborHead(3, utf8.length), utf8]);
    }
    if (Buffer.isBuffer(value)) {
        return Buffer.concat([cborHead(2, value.length), value]);
    }
    if (Array.isArray(value)) {
        // treated as a map of [key, value] pairs (preserves integer keys for COSE)
        const parts = [cborHead(5, value.length)];
        for (const [k, v] of value) {
            parts.push(cborEncode(k), cborEncode(v));
        }
        return Buffer.concat(parts);
    }
    throw new Error("unsupported CBOR value: " + typeof value);
}

// --- helpers ---

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest();
}

function counterBytes(signCount) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(signCount, 0);
    return b;
}

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

/**
 * Creates a soft authenticator bound to one credential (one P-256 keypair).
 *
 * @param {{ rpId: string, origin: string }} config — must match the SDK's
 *   relying party id (default: apiDomain host) and origin (default: websiteDomain).
 */
function createSoftAuthenticator({ rpId, origin }) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" });
    const x = Buffer.from(jwk.x, "base64url");
    const y = Buffer.from(jwk.y, "base64url");
    const credentialId = crypto.randomBytes(32);
    const rpIdHash = sha256(rpId);

    // COSE_Key: kty(1)=EC2(2), alg(3)=ES256(-7), crv(-1)=P-256(1), x(-2), y(-3)
    const coseKey = cborEncode([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, x],
        [-3, y],
    ]);

    return {
        credentialId,

        /**
         * @param registerOptions — response body of POST /auth/webauthn/options/register
         * @param {{ signCount?: number }} opts — initial counter value stored by the RP
         * @returns a RegistrationPayload for POST /auth/webauthn/signup
         */
        createAttestation(registerOptions, { signCount = 0 } = {}) {
            const clientDataJSON = Buffer.from(
                JSON.stringify({
                    type: "webauthn.create",
                    challenge: registerOptions.challenge,
                    origin,
                    crossOrigin: false,
                }),
                "utf8"
            );

            const attestedCredentialData = Buffer.concat([
                Buffer.alloc(16), // aaguid (zero = "none")
                (() => {
                    const len = Buffer.alloc(2);
                    len.writeUInt16BE(credentialId.length, 0);
                    return len;
                })(),
                credentialId,
                coseKey,
            ]);

            const authData = Buffer.concat([
                rpIdHash,
                Buffer.from([FLAG_UP | FLAG_UV | FLAG_AT]),
                counterBytes(signCount),
                attestedCredentialData,
            ]);

            const attestationObject = cborEncode([
                ["fmt", "none"],
                ["attStmt", []],
                ["authData", authData],
            ]);

            return {
                id: b64url(credentialId),
                rawId: b64url(credentialId),
                response: {
                    clientDataJSON: b64url(clientDataJSON),
                    attestationObject: b64url(attestationObject),
                    transports: ["internal"],
                },
                type: "public-key",
                clientExtensionResults: {},
                authenticatorAttachment: "platform",
            };
        },

        /**
         * @param signInOptions — response body of POST /auth/webauthn/options/signin
         * @param {{ signCount: number, userHandle: string }} opts — signCount is the
         *   counter value this assertion reports (a real authenticator increments it
         *   on every use; Apple/Google passkeys keep it at 0); userHandle is
         *   registerOptions.user.id from registration.
         * @returns an AuthenticationPayload for POST /auth/webauthn/signin
         */
        createAssertion(signInOptions, { signCount, userHandle }) {
            const clientDataJSON = Buffer.from(
                JSON.stringify({
                    type: "webauthn.get",
                    challenge: signInOptions.challenge,
                    origin,
                    crossOrigin: false,
                }),
                "utf8"
            );

            const authenticatorData = Buffer.concat([
                rpIdHash,
                Buffer.from([FLAG_UP | FLAG_UV]),
                counterBytes(signCount),
            ]);

            const signature = crypto
                .createSign("SHA256")
                .update(Buffer.concat([authenticatorData, sha256(clientDataJSON)]))
                .sign(privateKey); // DER-encoded ECDSA, as WebAuthn ES256 requires

            return {
                id: b64url(credentialId),
                rawId: b64url(credentialId),
                response: {
                    clientDataJSON: b64url(clientDataJSON),
                    authenticatorData: b64url(authenticatorData),
                    signature: b64url(signature),
                    userHandle,
                },
                type: "public-key",
                clientExtensionResults: {},
                authenticatorAttachment: "platform",
            };
        },
    };
}

module.exports = createSoftAuthenticator;
