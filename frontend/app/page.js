import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-4xl font-bold mb-4">Programming Q&A Tool</h1>
        <p className="text-gray-300 mb-6">
          A channel-based system for programming questions, replies, voting,
          attachments, and search.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/channels"
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg"
          >
            Open Channels
          </Link>

          <Link
            href="/signup"
            className="bg-gray-800 hover:bg-gray-700 px-5 py-3 rounded-lg"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="bg-gray-800 hover:bg-gray-700 px-5 py-3 rounded-lg"
          >
            Login
          </Link>

          <Link
            href="/search"
            className="bg-gray-800 hover:bg-gray-700 px-5 py-3 rounded-lg"
          >
            Search
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-3">What you can do</h2>
          <ul className="space-y-2 text-gray-300">
            <li>• Browse and create channels</li>
            <li>• Create posts in channels</li>
            <li>• Reply to posts and replies</li>
            <li>• Vote on posts and replies</li>
            <li>• Upload screenshots</li>
            <li>• Search content and users</li>
          </ul>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-3">Recommended flow</h2>
          <ol className="space-y-2 text-gray-300">
            <li>1. Sign up or log in</li>
            <li>2. Create or open a channel</li>
            <li>3. Create a post</li>
            <li>4. Open the post page</li>
            <li>5. Reply, vote, and upload screenshots</li>
            <li>6. Use the search page</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
