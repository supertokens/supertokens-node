import SuperTokens from "./supertokens";
import STError from "./error";
export * from "./error";
export default class SuperTokensWrapper {
    static init: typeof SuperTokens.init;
    static Error: typeof STError;
}
export declare let init: typeof SuperTokens.init;
