// @ts-nocheck
import { SessionClaim } from "../session/claims";
import { SessionClaimValidator } from "../session";
interface MfaClaimValue {
    c: {
        [factorId: string]: number;
    };
    next?: string[];
}
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class MfaClaimClass extends SessionClaim<MfaClaimValue> {
    readonly fetchValue: SessionClaim<MfaClaimValue>["fetchValue"];
    constructor();
    validators: {
        hasCompletedFactors: (factorIds?: string[]) => SessionClaimValidator;
        hasCompletedFactorWithinTime: (_factorId: string, _timeInSec: number) => SessionClaimValidator;
    };
    addToPayload_internal(payload: any, value: MfaClaimValue, _userContext: any): any;
    removeFromPayloadByMerge_internal(payload: any, _userContext?: any): any;
    removeFromPayload(payload: any, _userContext?: any): any;
    getValueFromPayload(payload: any, _userContext?: any): MfaClaimValue | undefined;
}
export declare const MfaClaim: MfaClaimClass;
export {};
