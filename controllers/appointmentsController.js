import { customers, services, appointments } from "../config/db.js";
import { ObjectId } from "mongodb";
import { isValidId } from "../utils/isValidId.js";
import { TIME_SLOTS } from "../config/timeSlots.js";


export async function getBookedSlots(req, res) {
  const { serviceId, date } = req.query;

  if (!serviceId || !date) {
    return res.status(400).send({ message: "serviceId and date are required" });
  }

  const taken = await appointments
    .find({
      serviceId: String(serviceId),
      appointmentDate: String(date),
      status: { $in: ["pending", "confirmed"] },
    })
    .toArray();

  const slots = taken.map((item) => item.timeSlot);
  res.send({ slots });
}


export async function createAppointment(req, res) {
  if (req.user?.role === "admin") {
    return res.status(403).send({ message: "Admin cannot book appointments" });
  }

  const { serviceId, appointmentDate, timeSlot, message = "" } = req.body;

  if (!serviceId || !isValidId(serviceId)) {
    return res.status(400).send({ message: "Invalid service id" });
  }

  if (!appointmentDate || !TIME_SLOTS.includes(timeSlot)) {
    return res.status(400).send({ message: "Date and valid time slot are required" });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (appointmentDate < today) {
    return res.status(400).send({ message: "Past date is not allowed" });
  }

  const service = await services.findOne({ _id: new ObjectId(serviceId) });
  if (!service) {
    return res.status(404).send({ message: "Service not found" });
  }

  const alreadyBooked = await appointments.findOne({
    serviceId,
    appointmentDate,
    timeSlot,
    status: { $in: ["pending", "confirmed"] },
  });

  if (alreadyBooked) {
    return res.status(409).send({ message: "This time slot is already booked" });
  }

  const newAppointment = {
    serviceId,
    customerId: req.user.id,
    appointmentDate,
    timeSlot,
    message: String(message).trim(),
    servicePrice: service.price,
    paymentStatus: "unpaid",
    status: "pending",
    createdAt: new Date(),
  };

  const result = await appointments.insertOne(newAppointment);
  res.status(201).send({ message: "Appointment booked", id: result.insertedId });
}


export async function getMyAppointments(req, res) {
  const myList = await appointments
    .find({ customerId: req.user.id })
    .sort({ createdAt: -1 })
    .toArray();

  const finalList = [];

  for (const item of myList) {
    let serviceName = "Service removed";
    let serviceImage = "";

    if (isValidId(item.serviceId)) {
      const service = await services.findOne({ _id: new ObjectId(item.serviceId) });
      if (service) {
        serviceName = service.serviceName;
        serviceImage = service.image;
      }
    }

    finalList.push({
      ...item,
      serviceName,
      serviceImage,
    });
  }

  res.send(finalList);
}


export async function confirmAppointment(req, res) {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).send({ message: "Invalid appointment id" });
  }

  const booking = await appointments.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).send({ message: "Appointment not found" });
  }

  if (booking.status !== "pending") {
    return res.status(400).send({ message: "Only pending booking can be confirmed" });
  }

  await appointments.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "confirmed" } }
  );

  res.send({ message: "Appointment confirmed" });
}


export async function getAllAppointments(req, res) {
  const allBookings = await appointments.find({}).sort({ createdAt: -1 }).toArray();
  const finalList = [];

  for (const item of allBookings) {
    let serviceName = "Service removed";
    let serviceImage = "";
    let customerName = "User removed";
    let customerEmail = "";

    if (isValidId(item.serviceId)) {
      const service = await services.findOne({ _id: new ObjectId(item.serviceId) });
      if (service) {
        serviceName = service.serviceName;
        serviceImage = service.image;
      }
    }

    if (isValidId(item.customerId)) {
      const customer = await customers.findOne({ _id: new ObjectId(item.customerId) });
      if (customer) {
        customerName = customer.name;
        customerEmail = customer.email;
      }
    }

    finalList.push({
      ...item,
      serviceName,
      serviceImage,
      customerName,
      customerEmail,
    });
  }

  res.send(finalList);
}


export async function cancelAppointment(req, res) {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).send({ message: "Invalid appointment id" });
  }

  const booking = await appointments.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).send({ message: "Appointment not found" });
  }

  if (booking.status === "cancelled") {
    return res.status(400).send({ message: "Already cancelled" });
  }

  await appointments.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "cancelled" } }
  );

  res.send({ message: "Appointment cancelled" });
}

// Customer cancels their OWN appointment: PATCH /appointments/:id/cancel-mine
// Only a pending appointment can be cancelled by the customer.
export async function cancelMyAppointment(req, res) {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).send({ message: "Invalid appointment id" });
  }

  const booking = await appointments.findOne({ _id: new ObjectId(id) });

  
  if (!booking || booking.customerId !== req.user.id) {
    return res.status(404).send({ message: "Appointment not found" });
  }

  if (booking.status !== "pending") {
    return res.status(400).send({ message: "Only pending appointments can be cancelled" });
  }

  await appointments.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "cancelled" } }
  );

  res.send({ message: "Appointment cancelled" });
}
