// @ts-nocheck
import { BaseRequest } from "./framework";
export default class NormalisedURLDomain {
    private value;
    constructor(url: string | ((req: BaseRequest) => string));
    getAsStringDangerous: (req?: BaseRequest | undefined) => string;
}
