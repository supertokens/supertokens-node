"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockQuerier = void 0;
const querier_1 = require("./querier");
const server_1 = require("@simplewebauthn/server");
const crypto_1 = __importDefault(require("crypto"));
const db = {
    generatedOptions: {},
    credentials: {},
    users: {},
};
const writeDb = (table, key, value) => {
    db[table][key] = value;
};
const readDb = (table, key) => {
    return db[table][key];
};
// const readDbBy = (table: keyof typeof db, func: (value: any) => boolean) => {
//     return Object.values(db[table]).find(func);
// };
const getMockQuerier = (recipeId) => {
    const querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
    const sendPostRequest = async (path, body, _userContext) => {
        var _a, _b;
        if (path.getAsStringDangerous().includes("/recipe/webauthn/options/register")) {
            const registrationOptions = await server_1.generateRegistrationOptions({
                rpID: body.relyingPartyId,
                rpName: body.relyingPartyName,
                userName: body.email,
                timeout: body.timeout,
                attestationType: body.attestation || "none",
                authenticatorSelection: {
                    userVerification: body.userVerification || "preferred",
                    requireResidentKey: body.requireResidentKey || false,
                    residentKey: body.residentKey || "required",
                },
                supportedAlgorithmIDs: body.supportedAlgorithmIDs || [-8, -7, -257],
                userDisplayName: body.displayName || body.email,
            });
            const id = crypto_1.default.randomUUID();
            const now = new Date();
            writeDb(
                "generatedOptions",
                id,
                Object.assign(Object.assign({}, registrationOptions), {
                    id,
                    origin: body.origin,
                    tenantId: body.tenantId,
                    email: body.email,
                    rpId: registrationOptions.rp.id,
                    createdAt: now.getTime(),
                    expiresAt: now.getTime() + body.timeout * 1000,
                })
            );
            // @ts-ignore
            return Object.assign({ status: "OK", webauthnGeneratedOptionsId: id }, registrationOptions);
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/options/signin")) {
            const signInOptions = await server_1.generateAuthenticationOptions({
                rpID: body.relyingPartyId,
                timeout: body.timeout,
                userVerification: body.userVerification || "preferred",
            });
            const id = crypto_1.default.randomUUID();
            const now = new Date();
            writeDb(
                "generatedOptions",
                id,
                Object.assign(Object.assign({}, signInOptions), {
                    id,
                    origin: body.origin,
                    tenantId: body.tenantId,
                    email: body.email,
                    createdAt: now.getTime(),
                    expiresAt: now.getTime() + body.timeout * 1000,
                })
            );
            // @ts-ignore
            return Object.assign({ status: "OK", webauthnGeneratedOptionsId: id }, signInOptions);
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signup")) {
            const options = readDb("generatedOptions", body.webauthnGeneratedOptionsId);
            if (!options) {
                // @ts-ignore
                return { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };
            }
            const registrationVerification = await server_1.verifyRegistrationResponse({
                expectedChallenge: options.challenge,
                expectedOrigin: options.origin,
                expectedRPID: options.rpId,
                response: body.credential,
            });
            if (!registrationVerification.verified) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const credentialId = body.credential.id;
            if (!credentialId) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const recipeUserId = crypto_1.default.randomUUID();
            const now = new Date();
            writeDb("credentials", credentialId, {
                id: credentialId,
                userId: recipeUserId,
                counter: 0,
                publicKey:
                    (_a = registrationVerification.registrationInfo) === null || _a === void 0
                        ? void 0
                        : _a.credential.publicKey.toString(),
                rpId: options.rpId,
                transports:
                    (_b = registrationVerification.registrationInfo) === null || _b === void 0
                        ? void 0
                        : _b.credential.transports,
                createdAt: now.toISOString(),
            });
            const user = {
                id: recipeUserId,
                timeJoined: now.getTime(),
                isPrimaryUser: true,
                tenantIds: [body.tenantId],
                emails: [options.email],
                phoneNumbers: [],
                thirdParty: [],
                webauthn: {
                    credentialIds: [credentialId],
                },
                loginMethods: [
                    {
                        recipeId: "webauthn",
                        recipeUserId,
                        tenantIds: [body.tenantId],
                        verified: true,
                        timeJoined: now.getTime(),
                        webauthn: {
                            credentialIds: [credentialId],
                        },
                        email: options.email,
                    },
                ],
            };
            writeDb("users", recipeUserId, user);
            const response = {
                status: "OK",
                user: user,
                recipeUserId,
            };
            // @ts-ignore
            return response;
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signin")) {
            const options = readDb("generatedOptions", body.webauthnGeneratedOptionsId);
            if (!options) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const credentialId = body.credential.id;
            const credential = readDb("credentials", credentialId);
            if (!credential) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const authenticationVerification = await server_1.verifyAuthenticationResponse({
                expectedChallenge: options.challenge,
                expectedOrigin: options.origin,
                expectedRPID: options.rpId,
                response: body.credential,
                credential: {
                    publicKey: new Uint8Array(credential.publicKey.split(",").map((byte) => parseInt(byte))),
                    transports: credential.transports,
                    counter: credential.counter,
                    id: credential.id,
                },
            });
            if (!authenticationVerification.verified) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const user = readDb("users", credential.userId);
            if (!user) {
                // @ts-ignore
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            // @ts-ignore
            return {
                status: "OK",
                user,
                recipeUserId: user.id,
            };
        }
        throw new Error(`Unmocked endpoint: ${path}`);
    };
    const sendGetRequest = async (path, _body, _userContext) => {
        if (path.getAsStringDangerous().includes("/recipe/webauthn/options")) {
            const webauthnGeneratedOptionsId = path.getAsStringDangerous().split("/").pop();
            if (!webauthnGeneratedOptionsId) {
                // @ts-ignore
                return { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };
            }
            const options = readDb("generatedOptions", webauthnGeneratedOptionsId);
            if (!options) {
                // @ts-ignore
                return { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };
            }
            return Object.assign({ status: "OK" }, options);
        }
        throw new Error(`Unmocked endpoint: ${path}`);
    };
    querier.sendPostRequest = sendPostRequest;
    querier.sendGetRequest = sendGetRequest;
    return querier;
};
exports.getMockQuerier = getMockQuerier;
