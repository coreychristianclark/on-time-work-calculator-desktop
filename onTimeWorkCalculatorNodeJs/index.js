import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  cors({
    origin: "https://coreychristianclark.github.io/on-time-work-calculator/",
  })
);
app.use(express.json());

app.use(express.static(path.join(__dirname, "public", "index.html")));

app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  const apiKey = process.env.API_KEY;
  console.log(apiKey);
  const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${start}&destinations=${end}&units=imperial&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching data from Distance Matrix API:", error);
    res.status(500).send("Error fetching data.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
