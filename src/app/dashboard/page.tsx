import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = (await cookies()).get('session_user_id');

  if (!session) {
    redirect('/');
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
      <p>Logged in as Torn ID: {session.value}</p>
    </div>
  );
}