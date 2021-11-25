const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET)


const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.towtc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// console.log(uri);

async function run() {
    try {
        await client.connect()
        const database = client.db('Doctor_Portal')
        const appointmentsCollection = database.collection('appointments')
        const usersCollection = database.collection('users')

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            res.json(result)
        });

        app.get('/appointments', async (req, res) => {
            const email = req.query.email
            const date = req.query.date
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query)
            const appointments = await cursor.toArray()
            res.json(appointments)
        })

        // registration user collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.json(result)
        })

        // google login user collection or update
        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result)
        })

        // for make admin
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            console.log('PUT', user);
            const filter = { email: user.email }
            const updateDoc = { $set: { role: 'admin' } }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.json(result)
        })

        // admin control
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true
            }
            res.json({ admin: isAdmin })
        })

        // for payment 
        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result= await appointmentsCollection.findOne(query)
            res.json(result)
        })

        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount=paymentInfo.price*100;
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: "usd",
              payment_method_types: [
                  "card"
              ]
            });
          
            res.json({
              clientSecret: paymentIntent.client_secret,
            });
          });

          // appointment update
          app.put('/appointments/:id', async(req,res)=>{
            const id=req.params.id;
            const payment=req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc={
                $set:{
                    payment: payment
                }
            }
            const result=await appointmentsCollection.updateOne(filter,updateDoc)
            res.json(result)
          })

        
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Doctor portal !')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})