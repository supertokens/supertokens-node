import { TypeInput } from "./types";
export declare class Querier {
    static instance: Querier | undefined;
    private hosts;
    private lastTriedIndex;
    static getInstance(): Querier;
    static initInstance(hosts: TypeInput): void;
}
