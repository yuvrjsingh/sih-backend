import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    trim: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    required: true
  },
  weatherData: {
    type: Object,
    default: {}
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lon: {
      type: Number,
      required: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
querySchema.index({ location: 1, createdAt: -1 });
querySchema.index({ createdAt: -1 });

const Query = mongoose.model('Query', querySchema);

export default Query;