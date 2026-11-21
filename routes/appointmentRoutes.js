import { Router } from "express"
import { customers } from "../config/db.js"
import { verifyToken } from "../middleware/auth.js"
import { getBookedSlots, createAppointment } from "../controllers/appointmentsController.js"

const router = Router()

router.get("/booked", verifyToken(customers), getBookedSlots)
router.post("/", verifyToken(customers), createAppointment)

export default router
