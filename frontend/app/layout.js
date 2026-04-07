import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Programming Q&A Tool",
  description: "Channel-based programming Q&A tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4">
          <div className="max-w-6xl mx-auto flex gap-6 items-center">
            <Link href="/" className="font-bold text-xl">
              Q&A Tool
            </Link>
            <Link href="/channels" className="hover:text-blue-400">
              Channels
            </Link>
            <Link href="/search" className="hover:text-blue-400">
              Search
            </Link>
            <Link href="/login" className="hover:text-blue-400">
              Login
            </Link>
            <Link href="/signup" className="hover:text-blue-400">
              Sign Up
            </Link>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}
