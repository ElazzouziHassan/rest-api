require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3131;

app.use(express.json());

app.get("/ping", (req, res) => {
  res.status(200).json({ message: "Hello From API" });
});

app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
