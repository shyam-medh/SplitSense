import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if the user already exists
    const existingUsers = await sql`
      SELECT * FROM "User" 
      WHERE email = ${email} OR name = ${name} 
      LIMIT 1
    `;
    const existingUser = existingUsers[0];

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === email ? 'Email already in use' : 'Name already in use' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const users = await sql`
      INSERT INTO "User" (name, email, password, "isGuest")
      VALUES (${name}, ${email}, ${hashedPassword}, false)
      RETURNING *
    `;
    const user = users[0];

    // Return the user without the password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during registration' },
      { status: 500 }
    );
  }
}
