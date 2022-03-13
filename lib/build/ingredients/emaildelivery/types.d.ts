// @ts-nocheck
export interface EmailService<T> {
    sendEmail: (
        input: T & {
            userContext: any;
        }
    ) => Promise<void>;
}
export declare type IngredientInterface<T> = {
    sendEmail: (
        input: T & {
            userContext: any;
        }
    ) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new EmailDeliveryRecipe object via constructor
 */
export interface TypeInput<T> {
    service: EmailService<T>;
    override?: (originalImplementation: IngredientInterface<T>) => IngredientInterface<T>;
}
