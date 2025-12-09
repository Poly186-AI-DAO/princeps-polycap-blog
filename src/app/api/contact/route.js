import { NextResponse } from 'next/server';
import connectDB from '@/src/lib/mongodb';
import Contact from '@/src/models/Contact';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, phone, projectDetails } = body;

    if (!name || !email || !projectDetails) {
      return NextResponse.json(
        { error: 'Name, email, and project details are required' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      projectDetails,
      ipAddress,
      userAgent,
      source: 'website-contact-form',
      status: 'new'
    });

    console.log(`New contact submission from ${email}`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been received. I\'ll get back to you soon!',
        contactId: contact._id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Contact form submission error:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit contact form. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Contact API endpoint. Use POST to submit contact form.' },
    { status: 200 }
  );
}
