import { loginWithTorn } from './lib/actions';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-md items-center justify-between font-mono text-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Faction Tooling Login</h1>
        
        <form action={loginWithTorn} className="flex flex-col gap-4">
          <input
            name="apiKey"
            type="password"
            placeholder="Enter Public Torn API Key"
            required
            className="p-3 border rounded text-black"
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
          >
            Authenticate with Torn
          </button>
        </form>
      </div>
    </main>
  );
}