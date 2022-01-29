import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

const idSchema = joi.string().length(24);
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
    const timeOfRegistration = Date.now()
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

app.delete("/messages/:messageID", async (req, res) => {
  const { user } = req.headers;
  const { messageID } = req.params;
  const validation = idSchema.validate(messageID);
  let mongoClient;

  if (validation.error) {
    res.status(422).send(validation.error.details);
    return;
  }
  
  try {
    mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
    const db = mongoClient.db("bate-papo-uol");
    const messageToDelete = await db.collection("messages").findOne({ _id: new ObjectId(messageID) });

    if (!messageToDelete){
      res.sendStatus(404);
      return;
    }
    if (messageToDelete.from !== user){
      res.sendStatus(401);
      return;
    }

    await db.collection("messages").deleteOne({ _id: new ObjectId(messageID)}); 

    res.sendStatus(200);  
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
  mongoClient.close();
})

setInterval(async () => {
  const mongoClient = await new MongoClient(process.env.Mongo_URI).connect();
  const db = mongoClient.db("bate-papo-uol");

  const users = await db.collection("participants").find().toArray();

  const usersfiltered = users.filter((u) => Date.now() - u.lastStatus > 10000);

  for (const user of usersfiltered){
    await db.collection("participants").deleteOne({...user});
    await db.collection("messages").insertOne({
      from: user.name,
      to: 'Todos', 
      text: 'sai da sala...', 
      type: 'status', 
      time: dayjs().format("HH:mm:ss")
    })
  }
  mongoClient.close();
}, 15000)

app.listen(5000, () => console.log("Server is listening on door 5000"));

