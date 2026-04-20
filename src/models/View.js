import mongoose from 'mongoose';

const ViewSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  views: { type: Number, default: 0 },
  lastViewed: { type: Date, default: Date.now },
});

const View = mongoose.models.View || mongoose.model('View', ViewSchema);

export default View;
