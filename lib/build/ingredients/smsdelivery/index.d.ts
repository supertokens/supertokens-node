// @ts-nocheck
import { TypeInput, SmsDeliveryInterface } from "./types";
export default class SmsDelivery<T> {
    ingredientInterfaceImpl: SmsDeliveryInterface<T>;
    constructor(config: TypeInput<T>);
}
