import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { connectDB } from "./config/mongo.js";

import retrieveRoute from "./routes/retrieve.route.js";

const app = express();
app.use(express.json());

app.use("/api", retrieveRoute);

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
