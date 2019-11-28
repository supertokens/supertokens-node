"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
class Querier {
    constructor() {
        this.hosts = [];
        this.lastTriedIndex = 0;
    }
    static getInstance() {
        if (Querier.instance == undefined) {
            Querier.instance = new Querier();
        }
        if (Querier.instance.hosts.length == 0) {
            throw error_1.generateError(
                error_1.AuthError.GENERAL_ERROR,
                new Error("Please call the init function before using any other functions of the SuperTokens library")
            );
        }
        return Querier.instance;
    }
    static initInstance(hosts) {
        if (Querier.instance == undefined) {
            if (hosts.length == 0) {
                throw error_1.generateError(
                    error_1.AuthError.GENERAL_ERROR,
                    new Error("Please provide at least one SuperTokens' core address")
                );
            }
            Querier.instance = new Querier();
            Querier.instance.hosts = hosts;
        }
    }
}
exports.Querier = Querier;
//# sourceMappingURL=querier.js.map
