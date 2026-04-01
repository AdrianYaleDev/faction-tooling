import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '../lib/actions';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user_id');

  if (!sessionUser) {
    redirect('/');
  }

  const user = await getDashboardData(sessionUser.value);

  if (!user) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">
              Welcome, {user.userName} 
              <span className="text-gray-500 ml-2 text-lg">[{sessionUser.value}]</span>
            </h1>
            {user.factionName ? (
              <p className="text-gray-400 mt-1">
                Member of <span className="text-green-400 font-semibold">{user.factionName}</span> 
                {user.factionTag && <span className="ml-1 text-gray-500">[{user.factionTag}]</span>}
              </p>
            ) : (
              <p className="text-gray-500 mt-1">No Faction Assigned</p>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Example Tool Card */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition cursor-pointer">
            <h3 className="font-bold mb-2">Faction Roster</h3>
            <p className="text-sm text-gray-400">View live status of all members in {user.factionTag || 'your faction'}.</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 opacity-50">
            <h3 className="font-bold mb-2">Chain Watcher</h3>
            <p className="text-sm text-gray-400">Coming soon: Real-time chain alerts.</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 opacity-50">
            <h3 className="font-bold mb-2">OC Planner</h3>
            <p className="text-sm text-gray-400">Coming soon: Automated Organized Crime scheduling.</p>
          </div>
        </section>
      </div>
    </main>
  );
}