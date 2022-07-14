// @ts-nocheck
export declare class PostSuperTokensInitCallbacks {
    static bootstrapCallbacks: (() => void)[];
    static addPostInitCallback(cb: () => void): void;
    static runPostInitCallbacks(): void;
}
