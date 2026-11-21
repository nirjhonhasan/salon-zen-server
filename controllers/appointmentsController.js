import { customers, services, appointments } from "../config/db.js"
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

// GET /appointments/my
// The logged-in customer sees only their own appointments.
export async function getMyAppointments(req, res) {
    // The customer id comes from the verified token, never from the URL or body.
    const myAppointments = await appointments
        .find({ customerId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray()

    // Load the services of these appointments, so the list can show a name and image.
    const serviceIds = myAppointments.map((item) => new ObjectId(item.serviceId))
    const myServices = await services.find({ _id: { $in: serviceIds } }).toArray()

    const result = myAppointments.map((item) => {
        const service = myServices.find((s) => s._id.toString() === item.serviceId)

        return {
            ...item,
            serviceName: service ? service.serviceName : "Service removed",
            serviceImage: service ? service.image : "",
        }
    })

    res.send(result)
}

// PATCH /appointments/:id/confirm
// Admin confirms an appointment. Only pending appointments can be confirmed.
export async function confirmAppointment(req, res) {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid appointment id" })
    }

    const appointment = await appointments.findOne({ _id: new ObjectId(id) })

    if (!appointment) {
        return res.status(404).send({ message: "Appointment not found" })
    }

    if (appointment.status !== "pending") {
        return res.status(400).send({ message: "Only pending appointments can be confirmed" })
    }

    await appointments.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "confirmed" } }
    )

    res.send({ message: "Appointment confirmed" })
}

// GET /appointments
// Admin sees every appointment, with the customer and service details.
export async function getAllAppointments(req, res) {
    const all = await appointments.find({}).sort({ createdAt: -1 }).toArray()

    const serviceIds = [...new Set(all.map((item) => item.serviceId))].filter(isValidId)
    const customerIds = [...new Set(all.map((item) => item.customerId))].filter(isValidId)

    const relatedServices = await services
        .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
        .toArray()
    const relatedCustomers = await customers
        .find({ _id: { $in: customerIds.map((id) => new ObjectId(id)) } })
        .project({ name: 1, email: 1, image: 1 })
        .toArray()

    const result = all.map((item) => {
        const service = relatedServices.find((s) => s._id.toString() === item.serviceId)
        const customer = relatedCustomers.find((c) => c._id.toString() === item.customerId)

        return {
            ...item,
            serviceName: service ? service.serviceName : "Service removed",
            serviceImage: service ? service.image : "",
            serviceCategory: service ? service.category : "",
            customerName: customer ? customer.name : "User removed",
            customerEmail: customer ? customer.email : "",
            customerImage: customer ? customer.image : "",
        }
    })

    res.send(result)
}

// PATCH /appointments/:id/cancel
// Admin cancels an appointment. Pending or confirmed appointments can be cancelled.
export async function cancelAppointment(req, res) {
    const id = req.params.id

    if (!isValidId(id)) {
        return res.status(400).send({ message: "Invalid appointment id" })
    }

    const appointment = await appointments.findOne({ _id: new ObjectId(id) })

    if (!appointment) {
        return res.status(404).send({ message: "Appointment not found" })
    }

    if (appointment.status !== "pending" && appointment.status !== "confirmed") {
        return res.status(400).send({ message: "Only pending or confirmed appointments can be cancelled" })
    }

    await appointments.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "cancelled" } }
    )

    res.send({ message: "Appointment cancelled" })
}
