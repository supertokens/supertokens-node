// @ts-nocheck
import { TypeInputWithService, SmsDeliveryInterface } from "./types";
export default class SmsDelivery<T> {
    ingredientInterfaceImpl: SmsDeliveryInterface<T>;
    constructor(config: TypeInputWithService<T>);
}
