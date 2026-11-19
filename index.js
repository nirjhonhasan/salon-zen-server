import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const PORT = process.env.PORT || 500
const app = express()

app.use(express.json())
app.use(cors())

app.get("/", (req, res)=>{
    res.send("Welcome to server 5000")
})



app.listen(PORT, ()=>{
    console.log("the server on running on port 5000");
})