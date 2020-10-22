import { TypeInput, NormalisedAppinfo } from "./types";
export default class SuperTokens {
    private static instance;
    appInfo: NormalisedAppinfo;
    constructor(config: TypeInput);
    static init(config: TypeInput): void;
    static reset(): void;
}
