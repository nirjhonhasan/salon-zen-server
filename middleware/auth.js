import { createRemoteJWKSet, jwtVerify } from 'jose'
import { ObjectId } from 'mongodb'


export function verifyToken(usersCollection) {
    // BetterAuth publishes its public keys here. jose downloads and caches them.
    const authUrl = (process.env.AUTH_URL || '').replace(/\/$/, '')
    const jwks = createRemoteJWKSet(new URL(`${authUrl}/api/auth/jwks`))

    return async (req, res, next) => {
        const authHeader = req.headers.authorization || ''
        const token = authHeader.split(' ')[1]

        if (!token) {
            return res.status(401).send({ message: 'Please sign in first' })
        }

        try {
            const { payload } = await jwtVerify(token, jwks, {
                issuer: authUrl,
                audience: authUrl,
            })

            if (!payload.sub || !ObjectId.isValid(payload.sub)) {
                return res.status(401).send({ message: 'Invalid or expired token' })
            }

            const user = await usersCollection.findOne({
                _id: new ObjectId(payload.sub),
            })

            if (!user) {
                return res.status(401).send({ message: 'User not found' })
            }

            if (user.isBlocked) {
                return res.status(403).send({ message: 'Your account is blocked' })
            }

            // Make the user available to the next function.
            req.user = { id: user._id.toString(), role: user.role }
            next()
        } catch (error) {
            res.status(401).send({ message: 'Invalid or expired token' })
        }
    }
}



// Use after verifyToken on routes that only admins may call.
export function verifyAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).send({ message: 'Admin access only' })
    }
    next()
}
