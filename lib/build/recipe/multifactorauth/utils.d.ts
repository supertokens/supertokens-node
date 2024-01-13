import { TypeInput, TypeNormalisedInput } from "./types";
import { UserContext } from "../../types";
export declare function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput;
export declare const isValidFirstFactor: (tenantId: string, factorId: string, userContext: UserContext) => Promise<boolean>;
