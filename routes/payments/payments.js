import { Router } from "express"
import { ObjectId } from "mongodb"
import { stripe } from "../../config/stripe.js"
import { customers, services, appointments } from "../../config/db.js"
import { verifyToken } from "../../middleware/auth.js"
import { isValidId } from "../../utils/isValidId.js"

const router = Router()

router.post("/create-checkout-session", verifyToken(customers), async (req, res) => {
    try {
        const { appointmentId } = req.body

        if (typeof appointmentId !== "string" || !isValidId(appointmentId)) {
            return res.status(400).json({ error: "Invalid appointment id" })
        }

        //step 1, check the appointment is available or not
        const appointment = await appointments.findOne({ _id: new ObjectId(appointmentId) })

        // The user comes from the verified token, never from the request body.
        if (!appointment || appointment.customerId !== req.user.id) {
            return res.status(404).json({ error: "Appointment not found" })
        }

        // Pay Now is only for confirmed and unpaid appointments.
        if (appointment.status !== "confirmed" || appointment.paymentStatus !== "unpaid") {
            return res.status(400).json({ error: "This appointment cannot be paid right now" })
        }

        const service = await services.findOne({ _id: new ObjectId(appointment.serviceId) })

        if (!service) {
            return res.status(404).json({ error: "Service not found" })
        }

        
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: service.serviceName,
                        },
                        unit_amount: Math.round(appointment.servicePrice * 0.00804*100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata: { appointmentId },
            success_url: `${process.env.AUTH_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.AUTH_URL}/booking-canceled`,
        })

        res.json({ url: session.url })
    } catch (error) {
        console.error("Checkout error:", error)
        res.status(500).json({ error: "Could not start the payment" })
    }
    console.log(session, "session for stripe");
    res.send({success: true})
    
})

export default router
