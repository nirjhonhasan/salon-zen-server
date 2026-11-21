import { customers } from "../config/db.js"
import { ObjectId } from "mongodb"
import { isValidId } from "../utils/isValidId.js"

// GET /customers
export async function getCustomers(req, res) {
    const cursor = customers.find({});
    const result = await cursor.toArray();
    res.send(result)
}

// GET /users
export async function getUsers(req, res) {
    const users = await customers
        .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, isBlocked: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .toArray()

    res.send(users)
}

// PATCH /users/:id/block
export async function blockUser(req, res) {
    const id = req.params.id
    const isBlocked = req.body.isBlocked

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid user id" })
    }

    if (typeof isBlocked !== "boolean") {
        return res.status(400).send({ message: "isBlocked must be true or false" })
    }

    if (id === req.user.id) {
        return res.status(400).send({ message: "You cannot block your own account" })
    }

    const user = await customers.findOne({ _id: new ObjectId(id) })

    if (!user) {
        return res.status(404).send({ message: "User not found" })
    }

    if (user.role === "admin") {
        return res.status(400).send({ message: "Admin accounts cannot be blocked" })
    }

    await customers.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isBlocked, updatedAt: new Date() } }
    )

    res.send({ message: isBlocked ? "User blocked" : "User unblocked" })
}

// PATCH /users/:id/role
export async function makeAdmin(req, res) {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid user id" })
    }

    const user = await customers.findOne({ _id: new ObjectId(id) })

    if (!user) {
        return res.status(404).send({ message: "User not found" })
    }

    if (user.role === "admin") {
        return res.status(400).send({ message: "This user is already an admin" })
    }

    if (user.isBlocked) {
        return res.status(400).send({ message: "Unblock this user before making them an admin" })
    }

    await customers.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin", updatedAt: new Date() } }
    )

    res.send({ message: "User is now an admin" })
}
