import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ten-ai';
    
    console.log(`Connecting to mocked MongoDB at ${mongoURI}...`);
    // Uncomment the next line to enable actual connection when a database exists
    // await mongoose.connect(mongoURI);
    
    console.log('MongoDB connection initialized (Mocked for MVP)');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
