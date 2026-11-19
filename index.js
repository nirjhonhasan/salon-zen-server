import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import { verifyToken, verifyAdmin } from './middleware/auth.js'

const PORT = process.env.PORT || 5000
const app = express()

app.use(express.json())
app.use(cors())

const client = new MongoClient(process.env.BETTER_DB_URI);
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const connectedClient = await connectToMongoDB()
const database = connectedClient.db("salon-zen");
const customers = database.collection("user");
const services = database.collection("services");


app.get("/", (req, res) => {
    res.send("Welcome to server 5000")
})



app.get("/customers", async(req, res)=>{
    const cursor = customers.find({});
    const result = await cursor.toArray();
    res.send(result)
})

app.get("/services", async(req, res)=>{
    const cursor = services.find({});
    const result = await cursor.toArray();
    res.send(result);
})







// Get one service by its id: GET /services/:id
app.get("/services/:id", async (req, res) => {
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
})

// Add a new service (admin only): POST /services
app.post("/services", verifyToken(customers), verifyAdmin, async (req, res) => {
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
})

// Check that an id from the URL looks like a MongoDB id (24 hex characters).
function isValidId(id) {
    return /^[a-f\d]{24}$/i.test(id)
}

// Update a service (admin only): PUT /services/:id
app.put("/services/:id", verifyToken(customers), verifyAdmin, async (req, res) => {
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
})

// Activate or deactivate a service (admin only): PATCH /services/:id/status
app.patch("/services/:id/status", verifyToken(customers), verifyAdmin, async (req, res) => {
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
})

// Delete a service (admin only): DELETE /services/:id
app.delete("/services/:id", verifyToken(customers), verifyAdmin, async (req, res) => {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    const result = await services.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Service not found" })
    }

    res.send({ message: "Service deleted" })
})

app.listen(PORT, () => {
    console.log("the server on running on port 5000");
})