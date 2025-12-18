const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const verifyFBToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("decoded info", decoded);
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    console.log(object);
  }
};

const admin = require("firebase-admin");

// const serviceAccount = require("./firebase-admin-key.json");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// missionScic11
// a11wy7frFYHhH0nN

const uri =
  "mongodb+srv://missionScic11:a11wy7frFYHhH0nN@cluster0.pej65ns.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("missionscic11DB");
    const userCollection = database.collection("user");
    const requestsCollection = database.collection("requests");

    //
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      userInfo.createdAt = new Date();
      userInfo.role = "donar";
      userInfo.status = "active";
      const result = await userCollection.insertOne(userInfo);

      res.send(result);
    });

    // all users
    app.get("/users", verifyFBToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.status(200).send(result);
    });

    // // single user
    // app.get('/users/:email', async (req, res)=>{
    //   const email = req.params.email;

    //   const query = {email:email};
    //   const result = await userCollection.findo
    // })

    // update status blocked activate
    app.patch("/update/user/status", verifyFBToken, async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };
      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const result = await userCollection.updateOne(query,updateStatus);
      res.send(result);
    });

    // requests

    app.post("/requests", verifyFBToken, async (req, res) => {
      const data = req.body;
      data.CreatedAt = new Date();
      const result = await requestsCollection.insertOne(data);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello E11");
});

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
