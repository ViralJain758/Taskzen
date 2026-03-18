import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "Missing MongoDB connection string. Set MONGO_URI_ATLAS (preferred) or MONGO_URI.",
      );
    }

    await mongoose.connect(mongoUri);
    console.log(
      `MongoDB connected (${mongoUri.includes("mongodb+srv://") ? "Atlas" : "custom URI"})`,
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;
