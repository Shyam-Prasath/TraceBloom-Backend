// server/src/routes/distributor.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_URL = process.env.VITE_API_BASE || 'http://localhost:4000';

router.get('/distributor/:email/batches', async (req, res) => {
  const { email } = req.params;

  try {
    const distributor = await prisma.user.findUnique({ where: { email } });
    if (!distributor) return res.status(404).json({ error: 'Distributor not found' });

    const batches = await prisma.batch.findMany({
      where: {
        distributorActions: {
          none: { distributorId: distributor.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(batches);
  } catch (err) {
    console.error('❌ Error fetching distributor batches:', err);
    res.status(500).json({ error: 'Server error while fetching batches' });
  }
});

router.post('/distributor/accept', async (req, res) => {
  const { batchId, distributorEmail, distributorName } = req.body;

  if (!batchId || !distributorEmail || !distributorName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const distributor = await prisma.user.findUnique({ where: { email: distributorEmail } });
    if (!distributor) return res.status(404).json({ error: 'Distributor not found' });

    const alreadyAccepted = await prisma.distributorBatch.findFirst({
      where: { batchId, action: 'accepted' },
    });
    if (alreadyAccepted) {
      return res.status(400).json({ error: 'Batch already accepted by another distributor' });
    }

    await prisma.distributorBatch.create({
      data: {
        batchId,
        distributorId: distributor.id,
        distributorName,
        distributorEmail,
        action: 'accepted',
      },
    });

    await prisma.batch.update({
      where: { batchId },
      data: { status: 'in-transit' },
    });

    const batch = await prisma.batch.findUnique({ where: { batchId } });

    await prisma.payment.create({
      data: {
        batchId,
        distributorId: distributor.id,
        farmerWallet: batch.farmerWallet,
        amount: 0,
        status: 'Pending',
      },
    });

    res.json({ message: 'Batch accepted successfully' });
  } catch (err) {
    console.error('❌ Error accepting batch:', err);
    res.status(500).json({ error: 'Server error while accepting batch' });
  }
});

router.post('/distributor/reject', async (req, res) => {
  const { batchId, distributorEmail, distributorName } = req.body;

  if (!batchId || !distributorEmail || !distributorName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const distributor = await prisma.user.findUnique({ where: { email: distributorEmail } });
    if (!distributor) return res.status(404).json({ error: 'Distributor not found' });

    await prisma.distributorBatch.create({
      data: {
        batchId,
        distributorId: distributor.id,
        distributorName,
        distributorEmail,
        action: 'rejected',
      },
    });

    res.json({ message: 'Batch rejected successfully' });
  } catch (err) {
    console.error('❌ Error rejecting batch:', err);
    res.status(500).json({ error: 'Server error while rejecting batch' });
  }
});

router.get('/distributor/:email/transactions', async (req, res) => {
  const { email } = req.params;

  try {
    const distributor = await prisma.user.findUnique({ where: { email } });
    if (!distributor) return res.status(404).json({ error: 'Distributor not found' });

    const payments = await prisma.payment.findMany({
      where: { distributorId: distributor.id },
      include: { batch: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    console.error('❌ Error fetching transactions:', err);
    res.status(500).json({ error: 'Server error fetching transactions' });
  }
});

router.get('/distributor/:email/shipments', async (req, res) => {
  const { email } = req.params;

  try {
    const distributor = await prisma.user.findUnique({
      where: { email },
    });
    if (!distributor)
      return res.status(404).json({ error: 'Distributor not found' });

    const shipments = await prisma.consumerBatch.findMany({
      where: {
        batch: {
          distributorActions: {
            some: {
              distributorId: distributor.id,
              action: 'accepted',
            },
          },
        },
        action: 'accepted',
      },
      include: {
        batch: true,
        consumer: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shipments);
  } catch (err) {
    console.error('❌ Error fetching shipments:', err);
    res.status(500).json({ error: 'Server error fetching shipments' });
  }
});


module.exports = router;
