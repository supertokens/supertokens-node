let assert = require("assert");
const { parseParams } = require("../../lib/build/framework/utils");

describe("test framework related util functions", () => {
    it("should be able to parse params", () => {
        assert.deepEqual(parseParams("?a=1&b=secondValue&c="), { a: ["1"], b: ["secondValue"] });
        assert.deepEqual(parseParams("?a=1&b=first,second&c=third"), {
            a: ["1"],
            b: ["first", "second"],
            c: ["third"],
        });
        assert.deepEqual(parseParams(""), {});
    });
});
