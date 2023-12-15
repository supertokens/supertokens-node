// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { SessionContainerInterface } from "../session/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static MultiFactorAuthClaim: import("./multiFactorAuthClaim").MultiFactorAuthClaimClass;
    static getFactorsSetupForUser(
        tenantId: string,
        userId: string,
        userContext?: Record<string, any>
    ): Promise<string[]>;
    static isAllowedToSetupFactor(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<boolean>;
    static markFactorAsCompleteInSession(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
    static addToDefaultRequiredFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let getFactorsSetupForUser: typeof Wrapper.getFactorsSetupForUser;
export declare let isAllowedToSetupFactor: typeof Wrapper.isAllowedToSetupFactor;
export declare let markFactorAsCompleteInSession: typeof Wrapper.markFactorAsCompleteInSession;
export declare const addToDefaultRequiredFactorsForUser: typeof Wrapper.addToDefaultRequiredFactorsForUser;
export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
