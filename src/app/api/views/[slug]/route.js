import { NextResponse } from 'next/server';
import connectDB from '@/src/lib/mongodb';
import mongoose from 'mongoose';

// Define a simple View schema if it doesn't exist
const ViewSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  views: { type: Number, default: 0 },
  lastViewed: { type: Date, default: Date.now },
});

const View = mongoose.models.View || mongoose.model('View', ViewSchema);

// GET view count for a slug
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { slug } = await params;
    
    const viewDoc = await View.findOne({ slug });
    
    return NextResponse.json({ 
      slug,
      views: viewDoc?.views || 0 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching view count:', error);
    return NextResponse.json({ 
      error: error.message,
      views: 0 
    }, { status: 500 });
  }
}

// POST to increment view count
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { slug } = await params;
    
    // Use findOneAndUpdate with upsert to increment or create
    const viewDoc = await View.findOneAndUpdate(
      { slug },
      { 
        $inc: { views: 1 },
        $set: { lastViewed: new Date() }
      },
      { 
        upsert: true,
        new: true
      }
    );
    
    return NextResponse.json({ 
      slug,
      views: viewDoc.views 
    }, { status: 200 });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
