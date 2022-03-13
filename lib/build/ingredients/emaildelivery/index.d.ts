// @ts-nocheck
import { TypeInput, IngredientInterface } from "./types";
export default class EmailDelivery<T> {
    static INGREDIENT_ID: string;
    ingredientInterfaceImpl: IngredientInterface<T>;
    constructor(config: TypeInput<T>);
}
