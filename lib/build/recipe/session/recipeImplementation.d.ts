// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput, KeyInfo, AntiCsrfType } from "./types";
import { Querier } from "../../querier";
export declare class HandshakeInfo {
    antiCsrf: AntiCsrfType;
    accessTokenBlacklistingEnabled: boolean;
    accessTokenValidity: number;
    refreshTokenValidity: number;
    private rawJwtSigningPublicKeyList;
    constructor(
        antiCsrf: AntiCsrfType,
        accessTokenBlacklistingEnabled: boolean,
        accessTokenValidity: number,
        refreshTokenValidity: number,
        rawJwtSigningPublicKeyList: KeyInfo[]
    );
    setJwtSigningPublicKeyList(updatedList: KeyInfo[]): void;
    getJwtSigningPublicKeyList(): KeyInfo[];
    clone(): HandshakeInfo;
}
export declare type Helpers = {
    querier: Querier;
    getHandshakeInfo: (forceRefetch?: boolean) => Promise<HandshakeInfo>;
    updateJwtSigningPublicKeyInfo: (keyList: KeyInfo[] | undefined, publicKey: string, expiryTime: number) => void;
    config: TypeNormalisedInput;
    getRecipeImpl: () => RecipeInterface;
};
export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    getRecipeImplAfterOverrides: () => RecipeInterface
): RecipeInterface;
