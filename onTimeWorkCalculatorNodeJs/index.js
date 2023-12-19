import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const apiKey = process.env.API_KEY;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://coreychristianclark.github.io",
      "https://optimal-sleep-calculator-map.uk.r.appspot.com",
      "https://ontimeworkcalculatordesktop.vercel.app",
    ],
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self';" +
      "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://optimal-sleep-calculator-map.uk.r.appspot.com;" +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com;" +
      "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com;" +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
      "font-src 'self' https://fonts.gstatic.com;"
  );
  next();
});

app.get("/api/getGoogleMapsApiKey", (req, res) => {
  if (apiKey) {
    res.json({ apiKey: apiKey });
  } else {
    console.error("Error: API Key not found.");
    res.status(500).send("API Key not available.");
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  next();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
