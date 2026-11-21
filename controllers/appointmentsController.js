import { services, appointments } from "../config/db.js"
import { ObjectId } from "mongodb"
import { isValidId } from "../utils/isValidId.js"
import { TIME_SLOTS } from "../config/timeSlots.js"

// GET /appointments/booked
export async function getBookedSlots(req, res) {
    const { serviceId, date } = req.query

    if (typeof serviceId !== "string" || typeof date !== "string") {
        return res.status(400).send({ message: "serviceId and date are required" })
    }

    const taken = await appointments
        .find({ serviceId, appointmentDate: date, status: { $in: ["pending", "confirmed"] } })
        .toArray()

    res.send({ slots: taken.map((item) => item.timeSlot) })
}

// POST /appointments
export async function createAppointment(req, res) {
    if (req.user.role === "admin") {
        return res.status(403).send({ message: "Admin accounts cannot book appointments" })
    }

    const { serviceId, appointmentDate, timeSlot } = req.body
    const message = typeof req.body.message === "string" ? req.body.message.trim() : ""

    if (typeof serviceId !== "string" || !isValidId(serviceId)) {
        return res.status(400).send({ message: "Invalid service id" })
    }

    if (typeof appointmentDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
        return res.status(400).send({ message: "Please choose a valid date" })
    }

    // Compare as text (YYYY-MM-DD) so time zones cannot shift the day.
    const today = new Date().toISOString().slice(0, 10)
    if (appointmentDate < today) {
        return res.status(400).send({ message: "The date cannot be in the past" })
    }

    if (!TIME_SLOTS.includes(timeSlot)) {
        return res.status(400).send({ message: "Please choose a valid time slot" })
    }

    if (message.length > 500) {
        return res.status(400).send({ message: "Message is too long (500 characters max)" })
    }

    const service = await services.findOne({ _id: new ObjectId(serviceId) })

    if (!service) {
        return res.status(404).send({ message: "Service not found" })
    }

    if (service.status !== "active") {
        return res.status(400).send({ message: "This service is not available for booking" })
    }

    // Only pending or confirmed appointments block a slot.
    const conflict = await appointments.findOne({
        serviceId,
        appointmentDate,
        timeSlot,
        status: { $in: ["pending", "confirmed"] },
    })

    if (conflict) {
        return res.status(409).send({ message: "This time slot is already booked. Please pick another." })
    }

    const result = await appointments.insertOne({
        serviceId,
        customerId: req.user.id, // from the verified token, never from the body
        appointmentDate,
        timeSlot,
        message,
        servicePrice: service.price, // copied from the service, never from the client
        paymentStatus: "unpaid",
        status: "pending",
        createdAt: new Date(),
    })

    res.status(201).send({ message: "Appointment booked", id: result.insertedId })
}
