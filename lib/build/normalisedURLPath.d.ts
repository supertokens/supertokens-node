export default class NormalisedURLPath {
    private value;
    constructor(rId: string, url: string);
    startsWith: (other: NormalisedURLPath) => boolean;
    appendPath: (rId: string, other: NormalisedURLPath) => NormalisedURLPath;
    getAsStringDangerous: () => string;
    equals: (other: NormalisedURLPath) => boolean;
}
export declare function normaliseURLPathOrThrowError(rId: string, input: string): string;
