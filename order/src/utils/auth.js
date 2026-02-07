const jwt = require('jsonwebtoken');


function getAuthCookie({userId="697de315a3170e0f831dad35", extra  = {role: 'user'}}) {
    const secret = process.env.JWT_SECRET || "test-secret";
    const payload = {id: userId, ...extra};
    const token = jwt.sign(payload, secret,{ expiresIn: '1h'});
    const cookieName = process.env.JWT_COOKIE_NAME || "token";
    return `${cookieName}=${token}`;
}
module.exports = {getAuthCookie}