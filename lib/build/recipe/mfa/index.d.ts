// @ts-nocheck
import MfaRecipe from "./recipe";
import SuperTokensError from "./error";
import { SessionContainer } from "../session";
export default class Wrapper {
    static init: typeof MfaRecipe.init;
    static Error: typeof SuperTokensError;
    static completeFactorInSession(session: SessionContainer, factorId: string, userContext?: any): Promise<void>;
}
export declare let init: typeof MfaRecipe.init;
export declare let Error: typeof SuperTokensError;
export declare let completeFactorInSession: typeof Wrapper.completeFactorInSession;
