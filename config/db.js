import { MongoClient } from "mongodb"
import "dotenv/config"

// Connect to MongoDB once, then share the collections with the controllers.
const client = new MongoClient(process.env.BETTER_DB_URI)

try {
    await client.connect()
    console.log("You successfully connected to MongoDB!")
} catch (err) {
    console.dir(err)
}

const database = client.db("salon-zen")

// "user" is owned by BetterAuth. We only read it and block/unblock users.
export const customers = database.collection("user")
export const services = database.collection("services")
export const appointments = database.collection("appointments")
