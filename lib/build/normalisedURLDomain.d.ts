export default class NormalisedURLDomain {
    private value;
    constructor(rId: string, url: string);
    getAsStringDangerous: () => string;
}
export declare function normaliseURLDomainOrThrowError(rId: string, input: string): string;
