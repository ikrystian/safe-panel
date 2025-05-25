"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return null; // Will redirect to dashboard
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Jest</h1>
              <span className="ml-2 text-sm text-gray-500">
                Sports Training Tracker
              </span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/sign-in"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Track Your</span>
            <span className="block text-blue-600">Training Journey</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Monitor your sports training attendance, track your progress, and
            stay motivated with Jest - the ultimate training companion for
            athletes.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/sign-up"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Start Tracking
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                href="/sign-in"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Track Attendance
              </h3>
              <p className="text-gray-600">
                Monitor your training attendance and see your progress over time
                with detailed analytics.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🏃‍♂️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Manage Trainings
              </h3>
              <p className="text-gray-600">
                Keep track of all your training sessions, schedules, and
                performance metrics in one place.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Mobile First
              </h3>
              <p className="text-gray-600">
                Designed for mobile devices, access your training data anywhere,
                anytime.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
