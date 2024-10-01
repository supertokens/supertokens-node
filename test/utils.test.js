const assert = require("assert");
const { getFromObjectCaseInsensitive, getTopLevelDomainForSameSiteResolution } = require("../lib/build/utils");

describe("SuperTokens utils test", () => {
    it("Test getFromObjectCaseInsensitive", () => {
        const testObj = {
            AuthOriZation: "test",
        };

        assert.equal(getFromObjectCaseInsensitive("test", testObj), undefined);
        // Exact
        assert.equal(getFromObjectCaseInsensitive("AuthOriZation", testObj), "test");
        // All lower case
        assert.equal(getFromObjectCaseInsensitive("authorization", testObj), "test");
        // Traditional case
        assert.equal(getFromObjectCaseInsensitive("Authorization", testObj), "test");
        // Weird casing
        assert.equal(getFromObjectCaseInsensitive("authoriZation", testObj), "test");
    });
});

describe("getTopLevelDomainForSameSiteResolution test", () => {
    it('should return "localhost" for localhost URLs', () => {
        assert.equal(getTopLevelDomainForSameSiteResolution("http://localhost:3000"), "localhost");
        assert.equal(getTopLevelDomainForSameSiteResolution("https://localhost"), "localhost");
    });

    it('should return "localhost" for localhost.org URLs', () => {
        assert.equal(getTopLevelDomainForSameSiteResolution("http://localhost.org"), "localhost");
        assert.equal(getTopLevelDomainForSameSiteResolution("https://localhost.org/test-path"), "localhost");
    });

    it('should return "localhost" for IP addresses', () => {
        assert.equal(getTopLevelDomainForSameSiteResolution("http://127.0.0.1"), "localhost");
        assert.equal(getTopLevelDomainForSameSiteResolution("https://192.168.1.1"), "localhost");
    });

    it("should return the correct domain for normal URLs", () => {
        assert.equal(getTopLevelDomainForSameSiteResolution("https://www.example.com"), "example.com");
        assert.equal(getTopLevelDomainForSameSiteResolution("http://sub.domain.co.uk"), "domain.co.uk");
    });

    assert.strictEqual(
        getTopLevelDomainForSameSiteResolution("https://ec2-xx-yyy-zzz-0.compute-1.amazonaws.com"),
        "ec2-xx-yyy-zzz-0.compute-1.amazonaws.com"
    );

    it("should handle .local domains correctly", () => {
        assert.equal(getTopLevelDomainForSameSiteResolution("http://myserver.local"), "myserver.local");
    });

    it("should throw an error for invalid domains", () => {
        assert.throws(() => {
            getTopLevelDomainForSameSiteResolution("http://invalid..com");
        }, Error);
    });
});
