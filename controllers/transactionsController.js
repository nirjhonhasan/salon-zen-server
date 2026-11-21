import { customers, services, appointments, transactions } from "../config/db.js"
import { ObjectId } from "mongodb"
import { isValidId } from "../utils/isValidId.js"

// GET /transactions
// Admin only. Read-only: this file never changes a transaction.
export async function getAllTransactions(req, res) {
    const allTransactions = await transactions.find({}).sort({ createdAt: -1 }).toArray()

    const finalList = []

    for (const item of allTransactions) {
        let customerName = "User removed"
        let customerEmail = ""
        let serviceName = "Service removed"

        // Find the customer who paid.
        if (isValidId(item.customerId)) {
            const customer = await customers.findOne({ _id: new ObjectId(item.customerId) })

            if (customer) {
                customerName = customer.name
                customerEmail = customer.email
            }
        }

        // Find the service through the appointment.
        if (isValidId(item.appointmentId)) {
            const appointment = await appointments.findOne({ _id: new ObjectId(item.appointmentId) })

            if (appointment && isValidId(appointment.serviceId)) {
                const service = await services.findOne({ _id: new ObjectId(appointment.serviceId) })

                if (service) {
                    serviceName = service.serviceName
                }
            }
        }

        finalList.push({ ...item, customerName, customerEmail, serviceName })
    }

    res.send(finalList)
}
