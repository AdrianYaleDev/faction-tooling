import { cookies } from 'next/headers';
import { getDashboardData } from '../lib/actions';
import DashboardTools from '../../components/DashboardTools';
import ToolCard from '../../components/ToolCard';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user_id');
  const user = await getDashboardData(sessionUser!.value);

  return (
    <DashboardTools>
      <ToolCard
        title="Faction Roster"
        description={`View live status of all members in ${user!.factionTag || 'your faction'}.`}
      />
      <ToolCard
        title="Faction Armory"
        description={`View Armory activity ${user!.factionTag || 'your faction'}.`}
        href="/dashboard/armory"
      />
      <ToolCard
        title="Chain Watcher"
        description="Coming soon: Real-time chain alerts."
        disabled
      />
      <ToolCard
        title="OC Planner"
        description="Coming soon: Automated Organized Crime scheduling."
        disabled
      />
	   <ToolCard
        title="Settings"
        description="Faction Settings."
        href="/dashboard/settings"
      />
    </DashboardTools>
  );
}