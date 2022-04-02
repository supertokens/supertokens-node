"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const primitiveClaim_1 = require("./primitiveClaim");
class BooleanClaim extends primitiveClaim_1.PrimitiveClaim {
    constructor(conf) {
        super(conf.id);
        this.fetch = conf.fetch;
    }
}
exports.BooleanClaim = BooleanClaim;
