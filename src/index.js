// server/src/index.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ethers } = require("ethers");
const prisma = require("./lib/prisma");

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const PORT = Number(process.env.PORT || 4000);

function createJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function randomNonce() {
  return crypto.randomBytes(16).toString("hex");
}

app.post("/api/auth/signup", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, role required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        nonce: randomNonce(),
      },
    });

    const token = createJwt({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/wallet/nonce", async (req, res) => {
  const { walletAddress, email } = req.body;
  if (!walletAddress || !email) {
    return res.status(400).json({ error: "walletAddress & email required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found. Signup first." });
    }

    const nonce = randomNonce();

    await prisma.user.update({
      where: { email },
      data: {
        walletAddress: walletAddress.toLowerCase(),
        nonce,
      },
    });

    res.json({ nonce });
  } catch (err) {
    console.error("❌ Wallet nonce error:", err);
    res.status(500).json({ error: "Wallet nonce failed" });
  }
});

app.post("/api/auth/wallet/verify", async (req, res) => {
  const { walletAddress, signature } = req.body;
  if (!walletAddress || !signature) {
    return res.status(400).json({ error: "walletAddress & signature required" });
  }

  try {
    const address = walletAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user || !user.nonce) {
      return res.status(400).json({ error: "User not found or nonce missing" });
    }

    const message = `Sign this message to login to TraceBloom. Nonce: ${user.nonce}`;
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();

    if (recovered !== address) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    await prisma.user.update({
      where: { walletAddress: address },
      data: { nonce: randomNonce() },
    });

    const token = createJwt({
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error("❌ Wallet verify error:", err);
    res.status(500).json({ error: "Wallet verification failed" });
  }
});

app.get("/api/users/email/:email", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ Fetch user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.use("/api", require("./routes/farmer"));
app.use("/api", require("./routes/distributor"));
app.use("/api/consumer", require("./routes/consumer"));

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
