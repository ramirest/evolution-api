import mongoose from 'mongoose';
import { Logger } from '@config/logger.config';

const logger = new Logger('MongoDB');

export async function connectMongoDB(uri?: string): Promise<void> {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-broker';
  
  try {
    await mongoose.connect(mongoUri);
    logger.info(`MongoDB - CONNECTED (${mongoUri.replace(/\/\/.*@/, '//***@')})`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.warn('MongoDB - DISCONNECTED');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
  }
}

// Handle mongoose connection events
mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB - Connection lost');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB - Reconnected');
});
