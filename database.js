import mongoose from 'mongoose';

let connection = null;

function connectToDatabase() {
  if (!connection) {
    connection = mongoose.connect(process.env.DATABASE_URL)
      .then(mongooseInstance => {
        console.log(`Mongoose ${mongooseInstance.version} connected to MongoDB.`);
        console.log(`Host: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      })
      .catch(error => {
        console.log('MongoDB connection failed.');
        console.log(error.message);
        // Allow future retries
        connection = null;
        throw error;
      });
  }
  return connection;
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

export { mongoReady };