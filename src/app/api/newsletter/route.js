import { NextResponse } from 'next/server';
import connectDB from '@/src/lib/mongodb';
import Newsletter from '@/src/models/Newsletter';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, source = 'website-footer' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      if (existingSubscriber.subscribed) {
        return NextResponse.json(
          { 
            success: true, 
            message: 'You\'re already subscribed to the field notes!',
            alreadySubscribed: true
          },
          { status: 200 }
        );
      } else {
        existingSubscriber.subscribed = true;
        existingSubscriber.unsubscribedAt = null;
        existingSubscriber.source = source;
        await existingSubscriber.save();

        return NextResponse.json(
          { 
            success: true, 
            message: 'Welcome back! Your subscription has been reactivated.',
            resubscribed: true
          },
          { status: 200 }
        );
      }
    }

    const subscriber = await Newsletter.create({
      email: email.toLowerCase(),
      source,
      ipAddress,
      userAgent,
      subscribed: true,
      verified: false
    });

    console.log(`New newsletter subscriber: ${email}`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Subscribed! Watch for field notes from the Poly186 build.',
        subscriberId: subscriber._id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Newsletter subscription error:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.message },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'This email is already subscribed' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Newsletter API endpoint. Use POST to subscribe.' },
    { status: 200 }
  );
}
