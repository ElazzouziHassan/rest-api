require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3131;

app.use(express.json());

const users = {};
const ip_register = {};
let items = [];

// Middleware : Authentification par token UUID
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token || !users[token]) {
    return res.status(401).json({ error: "Token invalide ou manquant" });
  }
  req.user = users[token];
  next();
};

// Middleware : Limitation personnalisée de requêtes (Token Bucket)
const rateLimiter = (req, res, next) => {
  const user = req.user;
  if (user.requestsNumber <= 0) {
    return res.status(429).json({
      error: "Quota épuisé",
      message: "Votre quota de requêtes est épuisé.",
    });
  }
  user.requestsNumber--;
  console.log(`[Requête] ${user.userId} - Quota restant : ${user.requestsNumber}`);
  next();
};

// Limiteur global IP pour routes critiques
const theLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message: { error: "Trop de tentatives. Réessayez plus tard." },
  skip: (req) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    return token && users[token]?.requestsNumber > 0;
  },
});

// Test route
app.get("/ping", (req, res) => {
  res.status(200).json({ message: "Hello From API !" });
});

// Enregistrement d’un utilisateur
app.post("/register", (req, res) => {
  const client_ip = req.ip || req.connection.remoteAddress;

  if (ip_register[client_ip] && users[ip_register[client_ip]]?.requestsNumber > 0) {
    return res.status(403).json({
      error: "Déjà enregistré",
      message: "Vous avez encore un quota actif.",
    });
  }

  const token = uuidv4();
  users[token] = {
    userId: uuidv4(),
    token,
    requestsNumber: 10,
    last_recharge: new Date(),
    ip: client_ip,
  };

  ip_register[client_ip] = token;

  res.status(201).json({
    token,
    requestsNumber: 10,
    message: "Enregistrement réussi. Vous avez 10 requêtes.",
  });
});

// Recharge du quota
app.post("/recharge", authenticate, theLimiter, (req, res) => {
  const user = req.user;
  let rechargeAmount = parseInt(req.body?.amount) || 10;
  rechargeAmount = Math.max(0, rechargeAmount);

  user.requestsNumber += rechargeAmount;
  user.last_recharge = new Date();

  res.status(200).json({
    message: `Rechargé de ${rechargeAmount} requêtes.`,
    newRequestsNumber: user.requestsNumber,
  });
});

// CRUD Items (protégé)
app.get("/items", authenticate, rateLimiter, (req, res) => {
  res.status(200).json(items);
  console.table(items);
});

app.post("/items", authenticate, rateLimiter, (req, res) => {
  const newItem = { id: items.length + 1, ...req.body };
  items.push(newItem);
  res.status(201).json(newItem);
  console.log("Nouveau item a été a jouté avec succeé")
});

app.put("/items/:id", authenticate, rateLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Item non trouvé" });
  }

  items[index] = { ...items[index], ...req.body };
  res.status(200).json(items[index]);

  console.log("Item numéro ", index, "a ete modifie !")
});

app.delete("/items/:id", authenticate, rateLimiter, (req, res) => {
  items = items.filter(item => item.id !== parseInt(req.params.id));
  res.status(204).end();

  console.log("suppresion a ete effectue avec succes")
});

// Démarrer le serveur
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
