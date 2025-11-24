import mongoose from 'mongoose';

const gameRecordSchema = new mongoose.Schema({
  gameTitle: { type: String, required: true },
  rawgId: { type: Number },
  status: { 
    type: String, 
    enum: ['Backlog', 'Playing', 'Finished', 'Platinum'], 
    default: 'Playing' 
  },
  hoursPlayed: { type: Number, min: 0 },
  userRating: { type: Number, min: 1, max: 5 },
  notes: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('GameRecord', gameRecordSchema);