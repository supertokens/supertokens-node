// @ts-nocheck
import { PrimitiveClaim } from "../session/claims";
import { SessionContainerInterface } from "../session/types";
declare class AccountLinkingClaimClass extends PrimitiveClaim<string> {
    constructor();
    resyncAndGetValue: (session: SessionContainerInterface, userContext: any) => Promise<string | undefined>;
}
export declare const AccountLinkingClaim: AccountLinkingClaimClass;
export {};
