const { Redis } = require("ioredis");

// Only create a real Redis connection when not running tests and a host is provided.
// This prevents accidental connection to production Redis during tests.
const shouldUseRedis = process.env.NODE_ENV !== 'test' && !!process.env.REDIS_HOST;

// Lightweight stub used when Redis should not be used (tests or no host configured)
const stub = {
    get: async () => null,
    set: async () => null,
    on: () => {},
};

if (!shouldUseRedis) {
    module.exports = stub;
} else {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    });

    redis.on("connect", () => {
        console.log("Connected to Redis successfully");
    });

    module.exports = redis;
}