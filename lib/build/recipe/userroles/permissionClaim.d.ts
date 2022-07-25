// @ts-nocheck
import { PrimitiveArrayClaim } from "../session/claimBaseClasses/primitiveArrayClaim";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class PermissionClaimClass extends PrimitiveArrayClaim<string> {
    constructor();
}
export declare const PermissionClaim: PermissionClaimClass;
