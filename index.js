const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// In-memory seat structure
const seats = [];
const TOTAL_SEATS = 10;

// Initialize seats with default state
for (let i = 1; i <= TOTAL_SEATS; i++) {
  seats.push({ id: i, status: 'available', lockedBy: null, lockExpireTime: null });
}

// Function to automatically release expired locks
function releaseExpiredLocks() {
  const now = Date.now();
  seats.forEach(seat => {
    if (seat.status === 'locked' && seat.lockExpireTime <= now) {
      seat.status = 'available';
      seat.lockedBy = null;
      seat.lockExpireTime = null;
      console.log(`Seat ${seat.id} lock expired.`);
    }
  });
}

// Run the cleanup every 5 seconds
setInterval(releaseExpiredLocks, 5000);

// 1️⃣ GET - View all seats
app.get('/seats', (req, res) => {
  releaseExpiredLocks(); // clean up before sending
  res.json({ success: true, seats });
});

// 2️⃣ POST - Lock a seat
app.post('/lock/:id', (req, res) => {
  const seatId = parseInt(req.params.id);
  const user = req.body.user;

  if (!user) return res.status(400).json({ success: false, message: 'User name required' });

  const seat = seats.find(s => s.id === seatId);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  releaseExpiredLocks();

  if (seat.status === 'booked') {
    return res.status(400).json({ success: false, message: 'Seat already booked' });
  }

  if (seat.status === 'locked') {
    return res.status(400).json({ success: false, message: 'Seat already locked by another user' });
  }

  // Lock the seat for 1 minute
  seat.status = 'locked';
  seat.lockedBy = user;
  seat.lockExpireTime = Date.now() + 60000;

  res.json({
    success: true,
    message: `Seat ${seatId} locked successfully by ${user} for 1 minute.`,
    seat
  });
});

// 3️⃣ POST - Confirm booking
app.post('/confirm/:id', (req, res) => {
  const seatId = parseInt(req.params.id);
  const user = req.body.user;

  if (!user) return res.status(400).json({ success: false, message: 'User name required' });

  const seat = seats.find(s => s.id === seatId);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  releaseExpiredLocks();

  if (seat.status === 'booked') {
    return res.status(400).json({ success: false, message: 'Seat already booked' });
  }

  if (seat.status !== 'locked' || seat.lockedBy !== user) {
    return res.status(400).json({ success: false, message: 'Seat not locked by you or lock expired' });
  }

  // Confirm booking
  seat.status = 'booked';
  seat.lockedBy = user;
  seat.lockExpireTime = null;

  res.json({
    success: true,
    message: `Seat ${seatId} booked successfully by ${user}.`,
    seat
  });
});

// 4️⃣ POST - Release a lock manually (optional)
app.post('/release/:id', (req, res) => {
  const seatId = parseInt(req.params.id);
  const user = req.body.user;

  const seat = seats.find(s => s.id === seatId);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  if (seat.status !== 'locked' || seat.lockedBy !== user) {
    return res.status(400).json({ success: false, message: 'Cannot release: Seat not locked by you' });
  }

  seat.status = 'available';
  seat.lockedBy = null;
  seat.lockExpireTime = null;

  res.json({ success: true, message: `Seat ${seatId} lock released by ${user}` });
});

// Start server
app.listen(port, () => {
  console.log(`🎟️ Ticket Booking System running on http://localhost:${port}`);
});
