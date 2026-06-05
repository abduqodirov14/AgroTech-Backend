import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// TODO: Routes
// TODO: Database ulanish
// TODO: Error handling

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'marketplace-service' });
});

app.listen(PORT, () => {
  console.log(`Marketplace service running on port ${PORT}`);
});
