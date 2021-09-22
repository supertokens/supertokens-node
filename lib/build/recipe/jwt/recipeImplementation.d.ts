import { Querier } from "../../querier";
import { NormalisedAppinfo } from "../../types";
import { CreateJWTResponse, JsonWebKey, RecipeInterface, TypeNormalisedInput } from "./types";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    constructor(querier: Querier, config: TypeNormalisedInput, appInfo: NormalisedAppinfo);
    createJWT: ({ payload, validity }: { payload: any; validity?: number | undefined }) => Promise<CreateJWTResponse>;
    getJWKS: () => Promise<{
        keys: JsonWebKey[];
    }>;
}
