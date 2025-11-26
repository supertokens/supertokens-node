// @ts-nocheck
import { PrimitiveArrayClaim } from "../session/claims";
import type Recipe from "./recipe";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class AllowedDomainsClaimClass extends PrimitiveArrayClaim<string> {
    constructor(getRecipe: () => Recipe);
}
