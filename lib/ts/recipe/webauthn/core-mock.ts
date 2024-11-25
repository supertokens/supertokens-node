import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import { UserContext } from "../../types";
import { generateAuthenticationOptions, generateRegistrationOptions } from "@simplewebauthn/server";
import crypto from "crypto";

const db = {
    generatedOptions: {} as Record<string, any>,
};
const writeDb = (table: keyof typeof db, key: string, value: any) => {
    db[table][key] = value;
};
// const readDb = (table: keyof typeof db, key: string) => {
//     return db[table][key];
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
            writeDb("generatedOptions", id, {
                ...registrationOptions,
                id,
                origin: body.origin,
                tenantId: body.tenantId,
            });
            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: id,
                ...registrationOptions,
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/options/signin")) {
            const signInOptions = await generateAuthenticationOptions({
                rpID: body.relyingPartyId,
                timeout: body.timeout,
                userVerification: body.userVerification || "preferred",
            });
            const id = crypto.randomUUID();
            writeDb("generatedOptions", id, { ...signInOptions, id, origin: body.origin, tenantId: body.tenantId });

            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: id,
                ...signInOptions,
            };
            // } else if (path.getAsStringDangerous().includes("/recipe/webauthn/user/recover/token")) {
            //     // @ts-ignore
            //     return {
            //         status: "OK",
            //         token: "dummy-recover-token",
            //     };
            // } else if (path.getAsStringDangerous().includes("/recipe/webauthn/user/recover/token/consume")) {
            //     // @ts-ignore
            //     return {
            //         status: "OK",
            //         userId: "dummy-user-id",
            //         email: "user@example.com",
            //     };
            // }
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signup")) {
            // @ts-ignore
            return {
                status: "OK",
                user: {
                    id: "dummy-user-id",
                    email: "user@example.com",
                    timeJoined: Date.now(),
                },
                recipeUserId: "dummy-recipe-user-id",
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signin")) {
            // @ts-ignore
            return {
                status: "OK",
                user: {
                    id: "dummy-user-id",
                    email: "user@example.com",
                    timeJoined: Date.now(),
                },
                recipeUserId: "dummy-recipe-user-id",
            };
        }

        throw new Error(`Unmocked endpoint: ${path}`);
    };

    querier.sendPostRequest = sendPostRequest;

    return querier;
};
