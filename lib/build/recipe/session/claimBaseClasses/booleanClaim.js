"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const primitiveClaim_1 = require("./primitiveClaim");
class BooleanClaim extends primitiveClaim_1.PrimitiveClaim {
    constructor(conf) {
        super(conf);
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isTrue: (maxAge) => this.validators.hasValue(true, maxAge),
            isFalse: (maxAge) => this.validators.hasValue(false, maxAge),
        });
    }
}
exports.BooleanClaim = BooleanClaim;
