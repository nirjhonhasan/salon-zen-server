import { Router } from "express"
import { customers } from "../config/db.js"
import { verifyToken, verifyAdmin } from "../middleware/auth.js"
import { getAllTransactions } from "../controllers/transactionsController.js"

const router = Router()

// Read-only: there is no POST, PUT or DELETE for transactions.
router.get("/", verifyToken(customers), verifyAdmin, getAllTransactions)

export default router
