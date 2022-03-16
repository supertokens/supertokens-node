// @ts-nocheck
import { TypeInput, EmailDeliveryInterface } from "./types";
export default class EmailDelivery<T> {
    ingredientInterfaceImpl: EmailDeliveryInterface<T>;
    constructor(config: TypeInput<T>);
}
