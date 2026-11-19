import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'

// Step 1: check the token that the client sends in the
// "Authorization: Bearer <token>" header.
// Step 2: load the user from the database, so a blocked user
// or a changed role is noticed even if the token is still valid.
export function verifyToken(usersCollection) {
    return async (req, res, next) => {
        const header = req.headers.authorization || ''
        const token = header.startsWith('Bearer ') ? header.slice(7) : ''

        if (!token) {
            return res.status(401).send({ message: 'Please sign in first' })
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET)

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
