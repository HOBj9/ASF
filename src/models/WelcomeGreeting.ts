import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWelcomeGreeting extends Document {
  name: string;
  content: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WelcomeGreetingSchema = new Schema<IWelcomeGreeting>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const WelcomeGreeting =
  (mongoose.models.WelcomeGreeting as Model<IWelcomeGreeting>) ||
  mongoose.model<IWelcomeGreeting>('WelcomeGreeting', WelcomeGreetingSchema);

export default WelcomeGreeting;
