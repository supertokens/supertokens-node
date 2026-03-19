const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        appDir: true,
    },
    webpack: (config, { isServer }) => {
        // Replace cross-fetch with a shim that exports native fetch.
        // cross-fetch's browser ponyfill uses XMLHttpRequest which doesn't exist
        // in Cloudflare Workers. Native fetch is available in all target runtimes.
        if (isServer) {
            config.resolve.alias["cross-fetch"] = path.resolve(__dirname, "cross-fetch-shim.js");
        }
        return config;
    },
};

module.exports = nextConfig;
