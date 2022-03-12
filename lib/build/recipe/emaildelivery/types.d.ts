// @ts-nocheck
export interface EmailService<T> {
    sendEmail: (input: T, userContext: any) => Promise<void>;
}
export declare type RecipeInterface<T> = {
    sendEmail: (input: T, userContext: any) => Promise<void>;
};
/**
 * config class parameter when parent Recipe create a new EmailDeliveryRecipe object via constructor
 */
export interface ConfigInput<T> {
    service: EmailService<T>;
    override?: (originalImplementation: RecipeInterface<T>) => RecipeInterface<T>;
}
