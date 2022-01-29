import express, { json, text } from "express";
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

const messageSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().pattern(/^private_message|message$/).required()
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
  let mongoClient;

  if (validation.error) {
    res.status(422).send(validation.error.details.message);
    return;
  }

  try {
    mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    const isNameInUse = await db.collection("participants").findOne({ name: req.body.name });

    if (isNameInUse) {
      res.sendStatus(409);
      return;
    }

    await db.collection("participants").insertOne({ name: req.body.name, lastStatus: Date.now() });

    const message = {
      from: req.body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs(timeOfRegistration).format("HH:mm:ss"),
    };

    await db.collection("messages").insertOne(message);

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
  mongoClient.close();
});

app.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;

  if (!user) {
    res.status(422).send("O username do requerinte deve ser informado!");
    return;
  }

  try {
    const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    const messages = await db.collection("messages").find({}).toArray();

    if (!limit) {
      res.send(messages);
    } else {
      let filteredMessages = [...messages].reverse().slice(0, limit);
      filteredMessages = filteredMessages.reverse();
      const allowedMessages = filteredMessages.filter((m) => {
        return user === m.to || user === m.from || m.to === "Todos";
      })

      res.send(allowedMessages);
    }

    mongoClient.close();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const time = dayjs().format("HH:mm:ss");
  const username = req.headers.user; 
  const message = { ...req.body, from: username };

  const validation = messageSchema.validate(message, { abortEarly: false });

  if (validation.error) {
    res.status(422).send(validation.error.details);
    return; 
  }

  try {
    const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();

    const db = mongoClient.db("bate-papo-uol");
    const isSenderconnected = await db.collection("participants").findOne({ name: username});

    if (!isSenderconnected){
      res.sendStatus(422);
      return;
    }

    await db.collection("messages").insertOne({ ...message, time });

    res.sendStatus(201);
    mongoClient.close();
  } catch (err){
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/status", async  (req, res) => {
  const { user } = req.headers;
  let mongoClient;
  try {
    mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    const isUserIntoDatabase = await db.collection("participants").findOne({ name: user });

    if (!isUserIntoDatabase) {
      res.sendStatus(404);
      return;
    }
    
    await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() }});
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
  mongoClient.close();
});


app.listen(5000, () => console.log("Server is listening on door 5000"));
