"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanClaim = void 0;
const primitiveClaim_1 = require("./primitiveClaim");
class BooleanClaim extends primitiveClaim_1.PrimitiveClaim {
    constructor(conf) {
        super(conf);
        this.validators = Object.assign(Object.assign({}, this.validators), {
            isTrue: (maxAge, id) => this.validators.hasValue(true, maxAge, id),
            isFalse: (maxAge, id) => this.validators.hasValue(false, maxAge, id),
        });
    }
}
exports.BooleanClaim = BooleanClaim;
