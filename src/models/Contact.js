import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: { 
      type: String,
      trim: true 
    },
    projectDetails: { 
      type: String, 
      required: true,
      trim: true 
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in-progress', 'closed'],
      default: 'new',
      index: true
    },
    source: {
      type: String,
      default: 'website-contact-form'
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'contacts',
  }
);

ContactSchema.index({ email: 1, createdAt: -1 });
ContactSchema.index({ status: 1, createdAt: -1 });

const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

export default Contact;
