import express from "express"
import cors from "cors"
import "dotenv/config"
import serviceRoutes from "./routes/serviceRoutes.js"
import appointmentRoutes from "./routes/appointmentRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import transactionRoutes from "./routes/transactionRoutes.js"
import paymentRoutes from "./routes/payments/payments.js"
import { stripe } from "./config/stripe.js"
import { ObjectId } from "mongodb"
import { appointments, transactions } from "./config/db.js"

const PORT = process.env.PORT || 5000
const app = express()

// Stripe calls this after a payment.
// It must come BEFORE express.json(), because the signature check needs the raw body.
async function stripeWebhook(req, res) {
    //after payment

    //step 01: 
    const stripeEvent = req.body;
    // console.log(event);

    //step 02 verify signature of stripe
    const signature = req.headers["stripe-signature"]
    let event

    try {
        event = stripe.webhooks.constructEvent(
            stripeEvent, signature,
            process.env.STRIPE_WEBHOOK_SECRET,
        )
    } catch (error) {
        console.error("Webhook signature failed:", error.message)
        return res.status(400).send("Invalid signature")
    }
    console.log("webhook triggered", event.type)

    //step 03: find the appointment that this payment belongs to
    const session = event.data.object
    const appointmentId = session.metadata?.appointmentId

    try {
        const appointment = appointmentId
            ? await appointments.findOne({ _id: new ObjectId(appointmentId) })
            : null


        const alreadySaved = await transactions.findOne({ stripeSessionId: session.id })

        if (!appointment || alreadySaved) {
            return res.json({ received: true })
        }

        if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
            await appointments.updateOne(
                { _id: appointment._id },
                { $set: { paymentStatus: "paid" } }
            )

            await transactions.insertOne({
                appointmentId,
                customerId: appointment.customerId,
                amount: session.amount_total / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                status: "paid",
                createdAt: new Date(),
            })
        }

        //step 05: payment failed or the payment page expired -> save a failed transaction
        if (
            event.type === "checkout.session.expired" ||
            event.type === "checkout.session.async_payment_failed"
        ) {
            await transactions.insertOne({
                appointmentId,
                customerId: appointment.customerId,
                amount: session.amount_total / 100,
                currency: session.currency,
                stripeSessionId: session.id,
                status: "failed",
                createdAt: new Date(),
            })
        }

        res.json({ received: true })
    } catch (error) {
        console.error("Webhook error:", error)
        res.status(500).send("Webhook failed")
    }
}

// The same webhook works on both URLs, so either "stripe listen" path is fine.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook)
app.post("/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook)

app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Welcome to server 5000")
})

// Each file in routes/ handles one group of URLs.
app.use("/services", serviceRoutes)
app.use("/appointments", appointmentRoutes)
app.use("/payments", paymentRoutes)
app.use("/transactions", transactionRoutes)
app.use(userRoutes) // /customers and /users

app.listen(PORT, () => {
    console.log("the server on running on port " + PORT)
})
export default app