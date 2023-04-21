// @ts-nocheck
export default class NormalisedURLPath {
    private value;
    constructor(url: string);
    startsWith: (other: NormalisedURLPath) => boolean;
    appendPath: (other: NormalisedURLPath) => NormalisedURLPath;
    getAsStringDangerous: () => string;
    equals: (other: NormalisedURLPath) => boolean;
    isARecipePath: () => boolean;
}
