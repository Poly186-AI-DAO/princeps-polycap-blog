import mongoose from 'mongoose';

const NewsletterSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    subscribed: {
      type: Boolean,
      default: true,
      index: true
    },
    source: {
      type: String,
      default: 'website-footer',
      enum: ['website-footer', 'contact-page', 'blog-post', 'other']
    },
    ipAddress: String,
    userAgent: String,
    unsubscribedAt: Date,
    verificationToken: String,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'newsletter_subscribers',
  }
);

NewsletterSchema.index({ email: 1 });
NewsletterSchema.index({ subscribed: 1, verified: 1 });
NewsletterSchema.index({ createdAt: -1 });

const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);

export default Newsletter;
