import ArmoryControls from '../../../../components/armory/ArmoryControls';
import { buildArmoryUserSummaries } from '../../../lib/armory';
import { getCurrentFactionArmoryLogs } from '../../../lib/actions';

type ArmoryUsersPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function ArmoryUsersPage({ searchParams }: ArmoryUsersPageProps) {
  const params = await searchParams;
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const defaultEndDate = today.toISOString().slice(0, 10);
  const defaultStartDate = weekAgo.toISOString().slice(0, 10);
  const startDate = params.startDate ?? defaultStartDate;
  const endDate = params.endDate ?? defaultEndDate;
  const logs = await getCurrentFactionArmoryLogs(5000, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const userSummaries = buildArmoryUserSummaries(logs);

  return (
    <section className="space-y-4">
      <ArmoryControls
        activeView="users"
        startDate={startDate}
        endDate={endDate}
        title="Faction Armory User Totals"
        description="Review overall movement by member, then expand each row to inspect which items they moved."
      />

      {userSummaries.length === 0 ? (
        <p className="text-gray-400">No logs found for your faction yet.</p>
      ) : (
        <div className="space-y-3">
          {userSummaries.map((user) => (
            <details key={`${user.tornId}-${user.userName}`} className="rounded-xl border border-gray-800 bg-gray-900/40">
              <summary className="grid cursor-pointer grid-cols-2 gap-3 px-4 py-4 text-sm text-gray-200 md:grid-cols-6">
                <span className="font-semibold text-white md:col-span-2">{user.userName}</span>
                <span>In: <span className="text-green-400">{user.inQuantity}</span></span>
                <span>Out: <span className="text-red-400">{user.outQuantity}</span></span>
                <span>Net: <span className={user.netQuantity >= 0 ? 'text-green-400' : 'text-red-400'}>{user.netQuantity}</span></span>
                <span className="text-gray-400">{user.itemCount} items</span>
              </summary>

              <div className="border-t border-gray-800 px-4 py-4">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="px-2 py-2 text-left">Category</th>
                      <th className="px-2 py-2 text-left">Item</th>
                      <th className="px-2 py-2 text-left">In</th>
                      <th className="px-2 py-2 text-left">Out</th>
                      <th className="px-2 py-2 text-left">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.items.map((item) => (
                      <tr key={`${user.userName}-${item.category}-${item.itemName}`} className="border-t border-gray-800 text-gray-200">
                        <td className="px-2 py-2">{item.category}</td>
                        <td className="px-2 py-2">{item.itemName}</td>
                        <td className="px-2 py-2 text-green-400">{item.inQuantity}</td>
                        <td className="px-2 py-2 text-red-400">{item.outQuantity}</td>
                        <td className={`px-2 py-2 ${item.netQuantity >= 0 ? 'text-green-400' : 'text-red-400'}`}>{item.netQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}