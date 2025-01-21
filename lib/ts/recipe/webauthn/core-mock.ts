import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import { UserContext } from "../../types";
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from "@simplewebauthn/server";
import crypto from "crypto";

const db = {
    generatedOptions: {} as Record<string, any>,
    credentials: {} as Record<string, any>,
    users: {} as Record<string, any>,
};
const writeDb = (table: keyof typeof db, key: string, value: any) => {
    db[table][key] = value;
};
const readDb = (table: keyof typeof db, key: string) => {
    return db[table][key];
};
// const readDbBy = (table: keyof typeof db, func: (value: any) => boolean) => {
//     return Object.values(db[table]).find(func);
// };

export const getMockQuerier = (recipeId: string) => {
    const querier = Querier.getNewInstanceOrThrowError(recipeId);

    const sendPostRequest = async <T = any>(
        path: NormalisedURLPath,
        body: any,
        _userContext: UserContext
    ): Promise<T> => {
        if (path.getAsStringDangerous().includes("/recipe/webauthn/options/register")) {
            const registrationOptions = await generateRegistrationOptions({
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

            const id = crypto.randomUUID();
            const now = new Date();

            const createdAt = now.getTime();
            const expiresAt = createdAt + body.timeout * 1000;
            writeDb("generatedOptions", id, {
                ...registrationOptions,
                id,
                origin: body.origin,
                tenantId: body.tenantId,
                email: body.email,
                rpId: registrationOptions.rp.id,
                createdAt,
                expiresAt,
            });

            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: id,
                createdAt,
                expiresAt,
                ...registrationOptions,
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/options/signin")) {
            const signInOptions = await generateAuthenticationOptions({
                rpID: body.relyingPartyId,
                timeout: body.timeout,
                userVerification: body.userVerification || "preferred",
            });

            const id = crypto.randomUUID();
            const now = new Date();

            const createdAt = now.getTime();
            const expiresAt = createdAt + body.timeout * 1000;
            writeDb("generatedOptions", id, {
                ...signInOptions,
                id,
                origin: body.origin,
                tenantId: body.tenantId,
                createdAt,
                expiresAt,
            });

            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: id,
                createdAt,
                expiresAt,
                ...signInOptions,
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signup")) {
            const options = readDb("generatedOptions", body.webauthnGeneratedOptionsId);
            if (!options) {
                // @ts-ignore
                return { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };
            }

            const registrationVerification = await verifyRegistrationResponse({
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

            const recipeUserId = crypto.randomUUID();
            const now = new Date();

            writeDb("credentials", credentialId, {
                id: credentialId,
                userId: recipeUserId,
                counter: 0,
                publicKey: registrationVerification.registrationInfo?.credential.publicKey.toString(),
                rpId: options.rpId,
                transports: registrationVerification.registrationInfo?.credential.transports,
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

            const authenticationVerification = await verifyAuthenticationResponse({
                expectedChallenge: options.challenge,
                expectedOrigin: options.origin,
                expectedRPID: options.rpId,
                response: body.credential,
                credential: {
                    publicKey: new Uint8Array(credential.publicKey.split(",").map((byte: string) => parseInt(byte))),
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

    const sendGetRequest = async <T = any>(
        path: NormalisedURLPath,
        _body: any,
        _userContext: UserContext
    ): Promise<T> => {
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

            return { status: "OK", ...options };
        }

        throw new Error(`Unmocked endpoint: ${path}`);
    };

    querier.sendPostRequest = sendPostRequest;
    querier.sendGetRequest = sendGetRequest;

    return querier;
};
