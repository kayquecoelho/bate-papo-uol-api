import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(json());
app.use(cors());

app.post("/participants", (req, res) => {});
app.post("/messages", (req, res) => {});
app.post("/status", (req, res) => {});

app.get("/participants", (req, res) => {});
app.get("/messages", (req, res) => {});

app.listen(4000, () => "Server is listening on door 4000");
