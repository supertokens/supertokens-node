"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockQuerier = void 0;
const querier_1 = require("../../querier");
const server_1 = require("@simplewebauthn/server");
const crypto_1 = __importDefault(require("crypto"));
const db = {
    generatedOptions: {},
};
const writeDb = (table, key, value) => {
    db[table][key] = value;
};
// const readDb = (table: keyof typeof db, key: string) => {
//     return db[table][key];
// };
const getMockQuerier = (recipeId) => {
    const querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
    const sendPostRequest = async (path, body, _userContext) => {
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
            writeDb(
                "generatedOptions",
                id,
                Object.assign(Object.assign({}, registrationOptions), {
                    id,
                    origin: body.origin,
                    tenantId: body.tenantId,
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
            writeDb(
                "generatedOptions",
                id,
                Object.assign(Object.assign({}, signInOptions), { id, origin: body.origin, tenantId: body.tenantId })
            );
            // @ts-ignore
            return Object.assign({ status: "OK", webauthnGeneratedOptionsId: id }, signInOptions);
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
exports.getMockQuerier = getMockQuerier;
