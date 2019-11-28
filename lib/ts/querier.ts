import { AuthError, generateError } from "./error";
import { TypeInput } from "./types";

export class Querier {
    static instance: Querier | undefined;
    private hosts: TypeInput = [];
    private lastTriedIndex = 0;

    static getInstance(): Querier {
        if (Querier.instance == undefined) {
            Querier.instance = new Querier();
        }
        if (Querier.instance.hosts.length == 0) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using any other functions of the SuperTokens library")
            );
        }
        return Querier.instance;
    }

    static initInstance(hosts: TypeInput) {
        if (Querier.instance == undefined) {
            if (hosts.length == 0) {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error("Please provide at least one SuperTokens' core address")
                );
            }
            Querier.instance = new Querier();
            Querier.instance.hosts = hosts;
        }
    }
}
