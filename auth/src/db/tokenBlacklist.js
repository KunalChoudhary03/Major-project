let redis;
if (process.env.NODE_ENV !== 'test') {
  try {
    redis = require('./redis');
  } catch (err) {
    redis = null;
  }
}

const fallback = new Map();

async function add(token, ttlSeconds) {
  // Try Redis first
  try {
    if (redis && typeof redis.set === 'function') {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
      } else {
        await redis.set(`blacklist:${token}`, '1');
      }
      return;
    }
  } catch (err) {
    // ignore and fallback
  }

  // In-memory fallback
  if (ttlSeconds && ttlSeconds > 0) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    fallback.set(token, expiresAt);
    setTimeout(() => fallback.delete(token), ttlSeconds * 1000 + 1000);
  } else {
    fallback.set(token, Infinity);
  }
}

async function has(token) {
  try {
    if (redis && typeof redis.get === 'function') {
      const v = await redis.get(`blacklist:${token}`);
      if (v) return true;
    }
  } catch (err) {
    // ignore and fallback
  }

  const exp = fallback.get(token);
  if (!exp) return false;
  if (exp === Infinity) return true;
  if (Date.now() > exp) {
    fallback.delete(token);
    return false;
  }
  return true;
}

module.exports = { add, has };
