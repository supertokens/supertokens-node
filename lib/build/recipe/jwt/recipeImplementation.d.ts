import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { JsonWebKey, RecipeInterface, TypeNormalisedInput } from "./types";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    constructor(querier: Querier, config: TypeNormalisedInput, appInfo: NormalisedAppinfo);
    createJWT: ({
        payload,
        validity,
    }: {
        payload: any;
        validity?: number | undefined;
    }) => Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    getJWKS: () => Promise<{
        keys: JsonWebKey[];
    }>;
}
