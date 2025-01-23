// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { UserContext } from "../../types";
export type SmsDeliveryInterface<T> = {
    sendSms: (
        input: T & {
            tenantId: string;
            userContext: UserContext;
        }
    ) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new SmsDeliveryIngredient object via constructor
 */
export interface TypeInput<T> {
    service?: SmsDeliveryInterface<T>;
    override?: (
        originalImplementation: SmsDeliveryInterface<T>,
        builder: OverrideableBuilder<SmsDeliveryInterface<T>>
    ) => SmsDeliveryInterface<T>;
}
export interface TypeInputWithService<T> {
    service: SmsDeliveryInterface<T>;
    override?: (
        originalImplementation: SmsDeliveryInterface<T>,
        builder: OverrideableBuilder<SmsDeliveryInterface<T>>
    ) => SmsDeliveryInterface<T>;
}
