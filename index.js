import express from "express"
import cors from "cors"
import "dotenv/config"
import serviceRoutes from "./routes/serviceRoutes.js"
import appointmentRoutes from "./routes/appointmentRoutes.js"
import userRoutes from "./routes/userRoutes.js"

const PORT = process.env.PORT || 5000
const app = express()

app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Welcome to server 5000")
})

// Each file in routes/ handles one group of URLs.
app.use("/services", serviceRoutes)
app.use("/appointments", appointmentRoutes)
app.use(userRoutes) // /customers and /users

app.listen(PORT, () => {
    console.log("the server on running on port " + PORT)
})
