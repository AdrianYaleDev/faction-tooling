import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '../lib/actions';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
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

        {children}
      </div>
    </main>
  );
}
