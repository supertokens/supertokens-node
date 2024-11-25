// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { SessionContainerInterface } from "../session/types";
import { FactorIds } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static MultiFactorAuthClaim: import("./multiFactorAuthClaim").MultiFactorAuthClaimClass;
    static FactorIds: {
        EMAILPASSWORD: string;
        WEBAUTHN: string;
        OTP_EMAIL: string;
        OTP_PHONE: string;
        LINK_EMAIL: string;
        LINK_PHONE: string;
        THIRDPARTY: string;
        TOTP: string;
    };
    static assertAllowedToSetupFactorElseThrowInvalidClaimError(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
    static getMFARequirementsForAuth(
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<import("./types").MFARequirementList>;
    static markFactorAsCompleteInSession(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
    static getFactorsSetupForUser(userId: string, userContext?: Record<string, any>): Promise<string[]>;
    static getRequiredSecondaryFactorsForUser(userId: string, userContext?: Record<string, any>): Promise<string[]>;
    static addToRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
    static removeFromRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let assertAllowedToSetupFactorElseThrowInvalidClaimError: typeof Wrapper.assertAllowedToSetupFactorElseThrowInvalidClaimError;
export declare let markFactorAsCompleteInSession: typeof Wrapper.markFactorAsCompleteInSession;
export declare let getFactorsSetupForUser: typeof Wrapper.getFactorsSetupForUser;
export declare let getRequiredSecondaryFactorsForUser: typeof Wrapper.getRequiredSecondaryFactorsForUser;
export declare let getMFARequirementsForAuth: typeof Wrapper.getMFARequirementsForAuth;
export declare const addToRequiredSecondaryFactorsForUser: typeof Wrapper.addToRequiredSecondaryFactorsForUser;
export declare const removeFromRequiredSecondaryFactorsForUser: typeof Wrapper.removeFromRequiredSecondaryFactorsForUser;
export { MultiFactorAuthClaim };
export { FactorIds };
export type { RecipeInterface, APIOptions, APIInterface };
