import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(json());
app.use(cors());

app.post("/participants", async (req, res) => {
  const participant = req.body;
  try {
    const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    await db.collection("participants").insertOne(participant);

    res.sendStatus(201);
    mongoClient.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/messages", (req, res) => {});
app.post("/status", (req, res) => {});

app.get("/participants", async (req, res) => {
  try {
    const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    const participants = await db.collection("participants").find({}).toArray();

    res.send(participants);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});
app.get("/messages", (req, res) => {});

app.listen(4000, () => "Server is listening on door 4000");
