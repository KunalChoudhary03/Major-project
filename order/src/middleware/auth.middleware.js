const jwt = require('jsonwebtoken');



function createAuthMiddleware(roles = [ "user" ]) {

    return function authMiddleware(req, res, next) {
        const cookieName = process.env.JWT_COOKIE_NAME || "token";
        const authHeader = req.headers?.authorization;
        const headerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader || null;

        let token =
            req.cookies?.[cookieName] ||
            req.cookies?.accessToken ||
            req.headers?.["x-access-token"] ||
            req.headers?.token ||
            headerToken ||
            req.body?.token ||
            req.query?.token ||
            null;

        if (typeof token === "string") {
            token = token.trim();

            if (token.toLowerCase().startsWith("bearer ")) {
                token = token.slice(7).trim();
            }

            if (token.includes("=") && (token.includes("token=") || token.includes("accessToken="))) {
                token = token.split(";")[0];
                token = token.split("=")[1] || token;
                token = token.trim();
            }

            if (token.startsWith('"') && token.endsWith('"')) {
                token = token.slice(1, -1).trim();
            }
        }

        if (!token) {
            return res.status(401).json({
                message: 'Unauthorized: No token provided',
            });
        }
        try {
            const secret = process.env.JWT_SECRET || "f296e40e28c2ee19340fd131decb5064b4aa24c071113bb883e8d23d";
            const secrets = [
                secret,
                process.env.VERIFY_SECRET,
                process.env.ACCESS_TOKEN_SECRET,
                process.env.REFRESH_TOKEN_SECRET,
            ].filter(Boolean);

            let alg = null;
            const tokenParts = typeof token === "string" ? token.split(".") : [];
            if (tokenParts.length === 3) {
                try {
                    const header = JSON.parse(Buffer.from(tokenParts[0], "base64").toString("utf8"));
                    alg = header?.alg || null;
                } catch (_) {
                    alg = null;
                }
            }

            const publicKey = process.env.JWT_PUBLIC_KEY || process.env.VERIFY_PUBLIC_KEY;
            let decoded;

            try {
                if (alg && (alg.startsWith("RS") || alg.startsWith("ES"))) {
                    if (!publicKey) {
                        throw new Error("Missing public key for asymmetric token");
                    }
                    decoded = jwt.verify(token, publicKey, {
                        clockTolerance: 30
                    });
                } else {
                    decoded = jwt.verify(token, secrets[0], {
                        clockTolerance: 30
                    });
                }
            } catch (error) {
                let verified = false;
                if (alg && (alg.startsWith("RS") || alg.startsWith("ES"))) {
                    if (publicKey) {
                        try {
                            decoded = jwt.verify(token, publicKey, { clockTolerance: 30 });
                            verified = true;
                        } catch (_) {
                            // fall through
                        }
                    }
                } else {
                    for (let i = 1; i < secrets.length; i += 1) {
                        try {
                            decoded = jwt.verify(token, secrets[i], {
                                clockTolerance: 30
                            });
                            verified = true;
                            break;
                        } catch (_) {
                            // try next secret
                        }
                    }
                }

                if (!verified) {
                    if (error.name === "TokenExpiredError" && process.env.NODE_ENV !== "production") {
                        decoded = jwt.verify(token, secrets[0], { ignoreExpiration: true });
                        verified = true;
                    } else {
                        throw error;
                    }
                }
            }

            const role = decoded.role || decoded.userRole || decoded.type || decoded.userType;
            if (roles.length > 0 && (!role || !roles.includes(role))) {
                return res.status(403).json({
                    message: 'Forbidden: Insufficient permissions',
                });
            }

            req.user = decoded;
            next();
        }
        catch (err) {
            return res.status(401).json({ message: 'Invalid token', error: err.message });
        }

    }

}


module.exports = createAuthMiddleware;