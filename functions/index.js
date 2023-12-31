const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");
const admin = require("firebase-admin");
admin.initializeApp();
const functions = require("firebase-functions");

const app = express();
const apiKey = functions.config().someservice.key;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://coreychristianclark.github.io",
      "https://optimal-sleep-calculator-map.uk.r.appspot.com",
      "https://optimal-sleep-calculator-map.web.app",
      "https://optimal-sleep-calculator-map.firebaseapp.com",
      "https://us-central1-optimal-sleep-calculator-map.cloudfunctions.net",
    ],
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Access-Control-Allow-Origin"],
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self';" +
      "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com;" +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com;" +
      "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com;" +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
      "font-src 'self' https://fonts.gstatic.com;"
  );
  next();
});

app.use(express.json());
app.use(express.static(path.join("public")));

app.get("/api/getGoogleMapsApiKey", (req, res) => {
  if (apiKey) {
    res.json({ apiKey: apiKey });
  } else {
    console.error("Error: API Key not found.");
    res.status(500).send("API Key not available.");
  }
});

app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  const encodedStart = encodeURIComponent(start);
  const encodedEnd = encodeURIComponent(end);
  const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedStart}&destinations=${encodedEnd}&units=imperial&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const data = await response.json();

    res.setHeader("Content-Type", "application/json");
    res.json(data);
  } catch (error) {
    res.status(500).send("Error fetching data.");
  }
});

exports.myApp = functions.https.onRequest(app);

exports.getApiKey = functions.https.onRequest(async (request, response) => {
  response.send({ key: apiKey });
  try {
    const result = await someService.doSomethingWithKey(apiKey);
    response.send({ result: result });
  } catch (error) {
    response.status(500).send({ error: "Internal Server Error" });
  }
});
