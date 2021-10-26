import { RecipeInterface } from "./types";
import { Querier } from "../../querier";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }
}
