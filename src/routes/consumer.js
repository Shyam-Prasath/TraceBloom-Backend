const express = require("express");
const prisma = require("../lib/prisma"); 

const router = express.Router();

router.get("/batches/:consumerId", async (req, res) => {
  const { consumerId } = req.params;
  console.log(`📦 [Consumer] Fetch available batches for consumerId: ${consumerId}`);

  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: "in-transit",
        distributorActions: {
          some: { action: "accepted" },
        },
        
        NOT: {
          consumerActions: {
            some: {
              consumerId,
              action: "rejected",
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    console.log(`✅ Consumer batches found: ${batches.length}`);
    res.json(batches);
  } catch (err) {
    console.error("❌ Consumer batch fetch error:", err);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

router.post("/accept", async (req, res) => {
  const { batchId, consumerId, consumerEmail } = req.body;

  try {
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      include: { distributorActions: true },
    });

    if (!batch) return res.status(404).json({ error: "Batch not found" });
    if (batch.status !== "in-transit")
      return res.status(400).json({ error: "Batch is not in-transit" });

    const existing = await prisma.consumerBatch.findFirst({
      where: { batchId, consumerId },
    });
    if (existing) return res.status(400).json({ error: "Already acted" });

    await prisma.consumerBatch.create({
      data: { batchId, consumerId, consumerEmail, action: "accepted" },
    });

    const updatedBatch = await prisma.batch.update({
      where: { batchId },
      data: { status: "delivered" },
    });

    const distributorId = batch.distributorActions[0]?.distributorId || null;
    if (distributorId) {
      await prisma.consumerPayment.create({
        data: {
          batchId,
          consumerId,
          distributorId,
          amount: batch.quantity * 10, 
          status: "Pending",
        },
      });
    }

    res.json({ success: true, batch: updatedBatch });
  } catch (err) {
    console.error("❌ Consumer accept error:", err);
    res.status(500).json({ error: "Failed to accept batch" });
  }
});

router.post("/reject", async (req, res) => {
  const { batchId, consumerId, consumerEmail } = req.body;

  try {
    const existing = await prisma.consumerBatch.findFirst({
      where: { batchId, consumerId },
    });
    if (existing) return res.status(400).json({ error: "Already acted" });

    await prisma.consumerBatch.create({
      data: { batchId, consumerId, consumerEmail, action: "rejected" },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Consumer reject error:", err);
    res.status(500).json({ error: "Failed to reject batch" });
  }
});

router.get("/payments/:consumerId", async (req, res) => {
  const { consumerId } = req.params;

  try {
    const payments = await prisma.consumerPayment.findMany({
      where: { consumerId },
      include: { batch: true, distributor: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.get("/reviews/:batchId", async (req, res) => {
  const { batchId } = req.params;

  try {
    const reviews = await prisma.consumerReview.findMany({
      where: { batchId },
      include: { consumer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});


router.post("/review", async (req, res) => {
  const { batchId, consumerId, rating, title, comment } = req.body;

  try {
    const review = await prisma.consumerReview.create({
      data: { batchId, consumerId, rating, title, comment },
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

router.get("/batches/:consumerId", async (req, res) => {
  const { consumerId } = req.params;
  try {
    const batches = await prisma.batch.findMany({
      include: {
        consumerActions: true,   
        distributorActions: true 
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(batches);
  } catch (err) {
    console.error("❌ Consumer batch fetch error:", err);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

router.get("/accepted-batches/:consumerId", async (req, res) => {
  const { consumerId } = req.params;
  try {
    const acceptedBatches = await prisma.consumerBatch.findMany({
      where: { consumerId, action: "accepted" },
      include: { batch: true }, 
      orderBy: { createdAt: "desc" },
    });

    res.json(acceptedBatches.map((cb) => cb.batch));
  } catch (err) {
    console.error("❌ Fetch accepted batches error:", err);
    res.status(500).json({ error: "Failed to fetch accepted batches" });
  }
});

module.exports = router;
