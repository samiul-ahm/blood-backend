const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const stripe = require("stripe")(process.env.STRIPE_SECRET);
const crypto = require("crypto");

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
const { info } = require("console");
const { url } = require("inspector");

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
    const paymentsCollection = database.collection("payments");

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

    //  status change
    // update donation status
    app.patch("/requests/:id/status", verifyFBToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
          return res.status(400).send({ message: "Status is required" });
        }

        const query = { _id: new ObjectId(id) };
        const update = { $set: { donation_status: status } };

        const result = await requestsCollection.updateOne(query, update);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Request not found" });
        }

        res.send({ message: "Status updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // my request
    app.get("/my-request", verifyFBToken, async (req, res) => {
      const email = req.decoded_email;
      const size = Number(req.query.size);
      const page = Number(req.query.page);
      const query = { requester_email: email };
      const result = await requestsCollection
        .find(query)
        .limit(size)
        .skip(size * page)
        .toArray();

      const totalRequest = await requestsCollection.countDocuments(query);

      res.send({ request: result, totalRequest });
    });

    // admin stat
    
app.get("/admin-stats", verifyFBToken, async (req, res) => {
  const totalUsers = await userCollection.countDocuments();
  const totalRequests = await requestsCollection.countDocuments();
  
  const fundingData = await paymentsCollection.aggregate([
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" }
      }
    }
  ]).toArray();

  const totalFunding = fundingData.length > 0 ? fundingData[0].totalAmount : 0;

  res.send({
    totalUsers,
    totalFunding,
    totalRequests
  });
});

    // all request show

    app.get("/all-requests", async (req, res) => {
      const page = Number(req.query.page) || 0;
      const limit = Number(req.query.limit) || 6;

      const skip = page * limit;

      const requests = await requestsCollection
        .find()
        .sort({ CreatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await requestsCollection.countDocuments();

      res.send({
        requests,
        total,
      });
    });

    // get single request by id
    app.get("/requests/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await requestsCollection.findOne(query);
      res.send(result);
    });

    // update status blocked activate
    app.patch("/update/user/status", verifyFBToken, async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };
      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const result = await userCollection.updateOne(query, updateStatus);
      res.send(result);
    });

    // payments
    app.post("/create-payment-checkout", async (req, res) => {
      const information = req.body;
      const amount = parseInt(information.donateAmount) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: "please donate",
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          donarName: information.donarName,
        },
        customer_email: information.donarEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      res.send({ url: session.url });
    });

    app.post("/success-payment", async (req, res) => {
      const { session_id } = req.query;
      //  console.log(session_id);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log(session);

      const transactionId = session.payment_intent;

      const isPaymentExist = await paymentsCollection.findOne({
        transactionId,
      });

      if (isPaymentExist) {
        return;
      }

      if (session.payment_status == "paid") {
        const paymentInfo = {
          amount: session.amount_total / 100,
          currency: session.currency,
          donarEmail: session.customer_email,
          transactionId,
          payment_status: session.payment_status,
          paidAT: new Date(),
        };
        const result = await paymentsCollection.insertOne(paymentInfo);
      }
    });

    // search
    app.get("/search-requests", async (req, res) => {
      const { bloodGroup, district, upazilla } = req.query;
      console.log(req.query);
      const query = {};
      if (!query) {
        return;
      }
      if (bloodGroup) {
        query.bloodGroup = bloodGroup.trim().toUpperCase();
      }
      if (district) {
        query.recipient_district = district;
      }
      if (upazilla) {
        query.recipient_upazilla = upazilla;
      }

      console.log(query);

      const result = await requestsCollection.find(query).toArray();
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
