// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { SessionContainerInterface } from "../session/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static MultiFactorAuthClaim: import("./multiFactorAuthClaim").MultiFactorAuthClaimClass;
    static getFactorsSetUpByUser(tenantId: string, userId: string, userContext?: any): Promise<string[]>;
    static isAllowedToSetupFactor(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: any
    ): Promise<boolean>;
    static markFactorAsCompleteInSession(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: any
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let markFactorAsCompleteInSession: typeof Wrapper.markFactorAsCompleteInSession;
export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
