import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Programming Q&A Tool",
  description: "Channel-based programming Q&A tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}
