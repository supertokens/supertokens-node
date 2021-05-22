export default class NormalisedURLDomain {
    private value;
    constructor(url: string);
    getAsStringDangerous: () => string;
}
export declare function normaliseURLDomainOrThrowError(input: string, ignoreProtocol?: boolean): string;
