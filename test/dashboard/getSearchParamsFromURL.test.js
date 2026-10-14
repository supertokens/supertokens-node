const { printPath } = require("../utils");
const assert = require("assert");
const { getSearchParamsFromURL } = require("../../lib/build/recipe/dashboard/api/usersGet");

describe(`User Dashboard getSearchParamsFromURL: ${printPath(
    "[test/dashboard/getSearchParamsFromURL.test.js]"
)}`, () => {
    it("returns decoded search params, excluding pagination params", () => {
        assert.deepStrictEqual(
            getSearchParamsFromURL(
                "/auth/dashboard/api/users?limit=10&email=a%40b.com&timeJoinedOrder=DESC&paginationToken=abc&provider=google"
            ),
            { email: "a@b.com", provider: "google" }
        );
    });

    it("returns the search params for a simple query", () => {
        assert.deepStrictEqual(getSearchParamsFromURL("/auth/dashboard/api/users?limit=10&email=a%40b.com"), {
            email: "a@b.com",
        });
    });

    it("returns no params for a path without a query", () => {
        assert.deepStrictEqual(getSearchParamsFromURL("/auth/dashboard/api/users"), {});
    });

    it("ignores the fragment", () => {
        assert.deepStrictEqual(getSearchParamsFromURL("/auth/dashboard/api/users?email=a%40b.com&phone=1#frag"), {
            email: "a@b.com",
            phone: "1",
        });
        assert.deepStrictEqual(getSearchParamsFromURL("/auth/dashboard/api/users#frag?email=a%40b.com"), {});
    });

    it("decodes + as a space", () => {
        assert.deepStrictEqual(getSearchParamsFromURL("/auth/dashboard/api/users?email=a+b"), { email: "a b" });
    });

    it("only reads the query of paths that look like they have a host", () => {
        assert.deepStrictEqual(getSearchParamsFromURL("@evil.test/x?email=a%40b.com"), { email: "a@b.com" });
        assert.deepStrictEqual(getSearchParamsFromURL("//evil.test/x?email=a%40b.com"), { email: "a@b.com" });
    });
});
