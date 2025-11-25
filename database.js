import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

mongoose.connect(dbUrl)
  .then(mongoose => {
    console.log(`Mongoose ${mongoose.version} connected to MongoDB.`);
    console.log(`Host: ${mongoose.connection.host}`);
  })
  .catch(error => handleError(error));

const handleError = (error) => {
  console.log("MongoDB connection failed.");
  console.log(error.message);
  if (dbUrl) {
     console.log("Current Connection String is set.");
  } else {
     console.log("DATABASE_URL environment variable not found.");
  }
}

function mongoReady(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database connection not ready' });
  }
  next();
}

export { mongoReady };