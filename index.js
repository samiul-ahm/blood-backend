const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());



app.get("/", (req, res)=>{
    res.send("Hello E11");
})

app.listen(port, ()=>{
    console.log(`app running on port ${port}`);
})