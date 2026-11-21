import { Router } from "express"
import { customers } from "../config/db.js"
import { verifyToken, verifyAdmin } from "../middleware/auth.js"
import {
    getBookedSlots, createAppointment, getMyAppointments, confirmAppointment,
    getAllAppointments, cancelAppointment,
} from "../controllers/appointmentsController.js"

const router = Router()

router.get("/booked", verifyToken(customers), getBookedSlots)
router.get("/my", verifyToken(customers), getMyAppointments)
router.get("/", verifyToken(customers), verifyAdmin, getAllAppointments)
router.post("/", verifyToken(customers), createAppointment)
router.patch("/:id/confirm", verifyToken(customers), verifyAdmin, confirmAppointment)
router.patch("/:id/cancel", verifyToken(customers), verifyAdmin, cancelAppointment)

export default router
