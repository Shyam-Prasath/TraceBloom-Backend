// server/src/routes/farmer.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const prisma = require("../lib/prisma");

cloudinary.config({
  cloud_name: process.env.cloudname,
  api_key: process.env.cloud_api_key,
  api_secret: process.env.cloud_api_secret,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "tracebloom/crops",
    allowed_formats: ["jpg", "jpeg", "png"],
    public_id: `${Date.now()}-${file.originalname}`,
  }),
});

const upload = multer({ storage });

router.get("/batches", async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress required" });
  }

  try {
    const batches = await prisma.batch.findMany({
      where: {
        farmerWallet: walletAddress.toLowerCase(),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      batches.map((b) => ({
        batchId: b.batchId,
        cropType: b.name,
        description: b.description,
        quantity: b.quantity,
        location: b.location,
        status: b.status,
        harvestDate: b.harvestDate
          ? b.harvestDate.toISOString().split("T")[0]
          : null,
        imageUrl: b.imageUrl,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        farmerName: b.farmerName,
        farmerPhone: b.farmerPhone,
      }))
    );
  } catch (err) {
    console.error("❌ Error fetching batches:", err);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

router.post("/batches", upload.single("image"), async (req, res) => {
  try {
    console.log("➡️ Creating batch");

    const {
      cropType,
      quantity,
      harvestDate,
      location,
      walletAddress,
      description,
      farmerName,
      farmerPhone,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress required" });
    }

    if (!cropType || !quantity) {
      return res.status(400).json({ error: "cropType & quantity required" });
    }

    if (!farmerName || !farmerPhone) {
      return res
        .status(400)
        .json({ error: "farmerName & farmerPhone required" });
    }

    const farmer = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    const imageUrl = req.file?.path || null;

    const created = await prisma.batch.create({
      data: {
        farmerId: farmer.id,               
        farmerWallet: farmer.walletAddress,
        farmerName,
        farmerPhone,
        name: cropType,
        description: description || null,
        quantity: Number(quantity),
        location: location || null,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        status: "harvested",
        imageUrl,
      },
    });

    res.status(201).json({
      batchId: created.batchId,
      cropType: created.name,
      description: created.description,
      quantity: created.quantity,
      location: created.location,
      status: created.status,
      harvestDate: created.harvestDate
        ? created.harvestDate.toISOString().split("T")[0]
        : null,
      imageUrl: created.imageUrl,
      farmerName: created.farmerName,
      farmerPhone: created.farmerPhone,
    });
  } catch (err) {
    console.error("❌ Error creating batch:", err);
    res.status(500).json({ error: "Failed to create batch" });
  }
});

router.get("/payments", async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress required" });
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { farmerWallet: walletAddress.toLowerCase() },
      include: { batch: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      payments.map((p) => ({
        batchId: p.batchId,
        amount: p.amount,
        status: p.status,
        date: p.createdAt.toISOString().split("T")[0],
        description: p.batch?.description || null,
      }))
    );
  } catch (err) {
    console.error("❌ Error fetching payments:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.get("/batches/:batchId", async (req, res) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { batchId: req.params.batchId },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    res.json({
      batchId: batch.batchId,
      cropType: batch.name,
      description: batch.description,
      quantity: batch.quantity,
      location: batch.location,
      status: batch.status,
      harvestDate: batch.harvestDate
        ? batch.harvestDate.toISOString().split("T")[0]
        : null,
      imageUrl: batch.imageUrl,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      farmerName: batch.farmerName,
      farmerPhone: batch.farmerPhone,
    });
  } catch (err) {
    console.error("❌ Error fetching batch:", err);
    res.status(500).json({ error: "Failed to fetch batch" });
  }
});

module.exports = router;
