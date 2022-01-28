import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const participantSchema = joi.object({
  name: joi.string().required(),
});

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

app.post("/participants", async (req, res) => {
  const validation = participantSchema.validate(req.body);

  if (validation.error) {
    res.status(422).send(validation.error.details.message);
    return;
  }

  try {
    const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");

    const nameInUse = await db.collection("participants").findOne({ name: req.body.name });

    if (nameInUse) {
      res.sendStatus(409);
      return;
    }
    const timeOfRegistration = Date.now();
    await db.collection("participants").insertOne({ name: req.body.name, lastStatus: timeOfRegistration });

    const message = {
      from: req.body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs(timeOfRegistration).format("HH:mm:ss"),
    };

    await db.collection("messages").insertOne(message);

    res.sendStatus(201);
    mongoClient.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", (req, res) => {});

app.post("/messages", (req, res) => {
  const message = req.body;
  const username = req.headers.user;
  const time = dayjs().format("HH:mm:ss");

  message.from = username;
  message.time = time;

  res.sendStatus(201);
});
app.post("/status", (req, res) => {});


app.listen(5000, () => console.log("Server is listening on door 5000"));
