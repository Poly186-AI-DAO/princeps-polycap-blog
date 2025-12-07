import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const getMongoUri = () => {
  const uri = process.env.MONGODB_DATABASE_URL;
  if (!uri) {
    throw new Error('Please define the MONGODB_DATABASE_URL environment variable');
  }
  return uri;
};

const getDbName = () => {
  return process.env.MONGODB_DB_NAME || process.env.COSMOS_DB_DATABASE_NAME || 'PrincepsBlog';
};

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: getDbName(),
    };

    cached.promise = mongoose.connect(getMongoUri(), opts).then((mongooseInstance) => {
      console.log('MongoDB connected successfully');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
