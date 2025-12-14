const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// missionScic11
// a11wy7frFYHhH0nN


const uri = "mongodb+srv://missionScic11:a11wy7frFYHhH0nN@cluster0.pej65ns.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

   const database = client.db('missionscic11DB'); 
   const userCollection = database.collection('user');

   app.post('/users', async(req, res)=>{
    const userInfo = req.body;
    userInfo.role = "Buyer";
    userInfo.createdAt = new Date();

    const result = await userCollection.insertOne(userInfo);

    res.send(result);
   })


   app.get('/users/role/:email', async (req, res)=>{
    const email = req.params.email;
    const query = {email:email}
    const result = await userCollection.findOne(query);
    console.log(result);
    res.send(result);
   })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res)=>{
    res.send("Hello E11");
})

app.listen(port, ()=>{
    console.log(`app running on port ${port}`);
})