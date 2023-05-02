export declare class PostSuperTokensInitCallbacks {
    static postInitCallbacks: (() => void)[];
    static addPostInitCallback(cb: () => void): void;
    static runPostInitCallbacks(): void;
}
