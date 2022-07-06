// @ts-nocheck
export declare class BootstrapService {
    static bootstrapCallbacks: (() => void)[];
    static addBootstrapCallback(cb: () => void): void;
    static runBootstrapCallbacks(): void;
}
