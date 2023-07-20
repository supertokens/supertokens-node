// @ts-nocheck
import { PrimitiveArrayClaim } from "../session/claims";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class AllowedDomainsClaimClass extends PrimitiveArrayClaim<string> {
    constructor();
}
export declare const AllowedDomainsClaim: AllowedDomainsClaimClass;
