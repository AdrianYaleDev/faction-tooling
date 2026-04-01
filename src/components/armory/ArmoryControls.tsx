import Link from 'next/link';
import { runTempCurrentFactionArmorySyncAction } from '../../app/lib/actions';

type ArmoryControlsProps = {
  activeView: 'items' | 'users';
  startDate: string;
  endDate: string;
  title: string;
  description: string;
};

export default function ArmoryControls({ activeView, startDate, endDate, title, description }: ArmoryControlsProps) {
  const itemHref = `/dashboard/armory?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const userHref = `/dashboard/armory/users?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const clearHref = activeView === 'items' ? '/dashboard/armory' : '/dashboard/armory/users';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-blue-400">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <form action={runTempCurrentFactionArmorySyncAction}>
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Temporary: Sync Faction Logs
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={itemHref}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeView === 'items'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Item Totals
        </Link>
        <Link
          href={userHref}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeView === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          User Totals
        </Link>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-4">
        <div>
          <label htmlFor="startDate" className="block text-xs uppercase text-gray-400 mb-1">Start Date</label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            defaultValue={startDate}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-xs uppercase text-gray-400 mb-1">End Date</label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            defaultValue={endDate}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
            Apply
          </button>
          <Link href={clearHref} className="text-gray-300 hover:text-white text-sm px-2 py-2">
            Clear
          </Link>
        </div>
      </form>
    </div>
  );
}