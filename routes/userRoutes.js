import { Router } from "express"
import { customers } from "../config/db.js"
import { verifyToken, verifyAdmin } from "../middleware/auth.js"
import { getCustomers, getUsers, blockUser, makeAdmin } from "../controllers/usersController.js"

const router = Router()

router.get("/customers", verifyToken(customers), verifyAdmin, getCustomers)
router.get("/users", verifyToken(customers), verifyAdmin, getUsers)
router.patch("/users/:id/block", verifyToken(customers), verifyAdmin, blockUser)
router.patch("/users/:id/role", verifyToken(customers), verifyAdmin, makeAdmin)

export default router
