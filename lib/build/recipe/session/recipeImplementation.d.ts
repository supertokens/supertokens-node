// @ts-nocheck
import { RecipeInterface, TypeNormalisedInput, KeyInfo, AntiCsrfType } from "./types";
import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
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
    appInfo: NormalisedAppinfo;
    getRecipeImpl: () => RecipeInterface;
};
export default function getRecipeInterface(
    querier: Querier,
    config: TypeNormalisedInput,
    appInfo: NormalisedAppinfo,
    getRecipeImplAfterOverrides: () => RecipeInterface
): RecipeInterface;
