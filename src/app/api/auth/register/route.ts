import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { userDb } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await userDb.getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new user
    const user = await userDb.createUser(email, hashedPassword, name)

    return NextResponse.json(
      { message: "User created successfully", userId: user._id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
