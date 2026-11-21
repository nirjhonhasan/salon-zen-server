import { services } from "../config/db.js"
import { ObjectId } from "mongodb"
import { isValidId } from "../utils/isValidId.js"

// GET /services
export async function getAllServices(req, res) {
    const cursor = services.find({});
    const result = await cursor.toArray();
    res.send(result);
}

// GET /services/:id
export async function getServiceById(req, res) {
    const id = req.params.id

    // A MongoDB id is always 24 hex characters.
    if (!/^[a-f\d]{24}$/i.test(id)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    const service = await services.findOne({ _id: new ObjectId(id) })

    if (!service) {
        return res.status(404).send({ message: "Service not found" })
    }

    res.send(service)
}

// POST /services
export async function addService(req, res) {
    const { serviceName, category, description, image } = req.body
    const price = Number(req.body.price)
    const duration = Number(req.body.duration)
    const status = req.body.status === "inactive" ? "inactive" : "active"

    // Check the data again on the server. Never trust the browser.
    if (!serviceName || !category || !description || !image) {
        return res.status(400).send({ message: "Please fill in all fields" })
    }

    if (!(price > 0) || !(duration > 0)) {
        return res.status(400).send({ message: "Price and duration must be more than 0" })
    }

    const newService = {
        serviceName,
        category,
        description,
        price,
        duration,
        image,
        status,
        createdAt: new Date(),
    }

    const result = await services.insertOne(newService)
    res.status(201).send({ message: "Service added", id: result.insertedId })
}

// PUT /services/:id
export async function updateService(req, res) {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    const { serviceName, category, description, image } = req.body
    const price = Number(req.body.price)
    const duration = Number(req.body.duration)
    const status = req.body.status === "inactive" ? "inactive" : "active"

    if (!serviceName || !category || !description || !image) {
        return res.status(400).send({ message: "Please fill in all fields" })
    }

    if (!(price > 0) || !(duration > 0)) {
        return res.status(400).send({ message: "Price and duration must be more than 0" })
    }

    const result = await services.updateOne(
        { _id: new ObjectId(id) },
        { $set: { serviceName, category, description, image, price, duration, status } }
    )

    if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Service not found" })
    }

    res.send({ message: "Service updated" })
}

// PATCH /services/:id/status
export async function updateServiceStatus(req, res) {
    const id = req.params.id
    const status = req.body.status

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    if (status !== "active" && status !== "inactive") {
        return res.status(400).send({ message: "Status must be active or inactive" })
    }

    const result = await services.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
    )

    if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Service not found" })
    }

    res.send({ message: "Service is now " + status })
}

// DELETE /services/:id
export async function deleteService(req, res) {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    const result = await services.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Service not found" })
    }

    res.send({ message: "Service deleted" })
}
