// @ts-nocheck
export default class OverrideableBuilder<T extends Record<string, undefined | ((...args: any[]) => any)>> {
    private layers;
    private proxies;
    result?: T;
    constructor(originalImplementation: T);
    override(overrideFunc: (originalImplementation: T, builder?: OverrideableBuilder<T>) => T): OverrideableBuilder<T>;
    build(): T;
}
