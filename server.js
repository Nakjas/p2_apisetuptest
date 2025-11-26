import express from 'express';
import cors from 'cors';

import { mongoReady } from './database.js';
import GameRecord from './Models/gamerecords.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(cors());


app.get('/api/games', mongoReady, async (req, res) => {
  try {
    const games = await GameRecord.find().sort({ updatedAt: -1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/games', mongoReady, async (req, res) => {
  try {
    const existingGame = await GameRecord.findOne({ gameTitle: req.body.gameTitle });

    if (existingGame) {
      return res.status(400).json({ error: 'This game is already in your list.' });
    }

    const newGame = await GameRecord.create(req.body);
    res.status(201).json(newGame);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/games/:id', mongoReady, async (req, res) => {
  try {
    const updatedGame = await GameRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedGame);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/games/:id', mongoReady, async (req, res) => {
  try {
    await GameRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});