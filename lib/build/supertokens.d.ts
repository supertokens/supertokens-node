import { TypeInput, NormalisedAppinfo } from "./types";
import RecipeModule from './recipeModule';
export default class SuperTokens {
    private static instance;
    appInfo: NormalisedAppinfo;
    recipeModules: RecipeModule[];
    constructor(config: TypeInput);
    static init(config: TypeInput): void;
    static reset(): void;
}
