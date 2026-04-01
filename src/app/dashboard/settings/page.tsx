import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '../../lib/actions';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user_id');
  if (!sessionUser) redirect('/');

  const user = await getDashboardData(sessionUser.value);
  
  // 1. Guard against Null or Array
  if (!user || Array.isArray(user)) redirect('/');

  // 2. Guard against Faction-less users (important for Torn!)
  if (!user.factionId) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold">No Faction Found</h1>
          <p className="text-gray-400">You must be in a faction to access these settings.</p>
        </div>
      </main>
    );
  }

  // Override for testing as requested
  const isAuthorized = true; 

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Faction Settings</h1>
          <p className="text-gray-400">
            Manage <span className="text-blue-400">{user.factionName}</span> system configurations.
          </p>
        </header>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">System API Key</h2>
          
          {isAuthorized ? (
            <SettingsForm factionId={user.factionId} />
          ) : (
            <div className="bg-red-900/20 border border-red-900 text-red-400 p-4 rounded-lg">
              <strong>Access Denied:</strong> Only the Faction Leader can update the System API Key.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}