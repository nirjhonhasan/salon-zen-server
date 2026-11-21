import { Router } from "express"
import { customers } from "../config/db.js"
import { verifyToken, verifyAdmin } from "../middleware/auth.js"
import {
    getAllServices, getServiceById, addService,
    updateService, updateServiceStatus, deleteService,
} from "../controllers/servicesController.js"

const router = Router()

router.get("/", getAllServices)
router.get("/:id", verifyToken(customers), getServiceById)
router.post("/", verifyToken(customers), verifyAdmin, addService)
router.put("/:id", verifyToken(customers), verifyAdmin, updateService)
router.patch("/:id/status", verifyToken(customers), verifyAdmin, updateServiceStatus)
router.delete("/:id", verifyToken(customers), verifyAdmin, deleteService)

export default router
