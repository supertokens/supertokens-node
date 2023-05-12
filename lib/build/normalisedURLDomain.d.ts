// @ts-nocheck
export default class NormalisedURLDomain {
    private value;
    constructor(url: string | ((userContext: any) => string | undefined));
    getAsStringDangerous: (userContext?: any) => string;
}
