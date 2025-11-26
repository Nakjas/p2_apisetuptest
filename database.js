import mongoose from 'mongoose';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable not found.');
}

let connectionPromise = null;

function connectToDatabase() {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(dbUrl)
      .then(mongooseInstance => {
        console.log(`Mongoose ${mongooseInstance.version} connected to MongoDB.`);
        console.log(`Host: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      })
      .catch(error => {
        console.log('MongoDB connection failed.');
        console.log(error.message);
        // Allow future retries
        connectionPromise = null;
        throw error;
      });
  }
  return connectionPromise;
}

async function mongoReady(req, res, next) {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    return res
      .status(503)
      .json({ error: 'Database connection not ready' });
  }
}

export { mongoReady, connectToDatabase };