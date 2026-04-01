import ArmoryControls from '../../../components/armory/ArmoryControls';
import { buildArmoryItemSummaries, ARMORY_CATEGORY_ORDER } from '../../lib/armory';
import { getCurrentFactionArmoryLogs } from '../../lib/actions';

type ArmoryPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function ArmorysPage({ searchParams }: ArmoryPageProps) {
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
	const itemSummaries = buildArmoryItemSummaries(logs);
	const visibleCategories = ARMORY_CATEGORY_ORDER.filter((category) => itemSummaries.some((item) => item.category === category));

	return (
		<section className="space-y-4">
			<ArmoryControls
				activeView="items"
				startDate={startDate}
				endDate={endDate}
				title="Faction Armory Item Totals"
				description="Track total stock movement per item, then expand each row to see which members moved that item."
			/>

			{itemSummaries.length === 0 ? (
				<p className="text-gray-400">No logs found for your faction yet.</p>
			) : (
				<div className="space-y-6">
					{visibleCategories.map((category) => (
						<div key={category} className="space-y-2">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold text-white">{category}</h3>
								<span className="text-sm text-gray-400">
									{itemSummaries.filter((item) => item.category === category).length} items
								</span>
							</div>
							<div className="space-y-3">
								{itemSummaries
									.filter((item) => item.category === category)
									.map((item) => (
										<details key={`${item.category}-${item.itemName}`} className="rounded-xl border border-gray-800 bg-gray-900/40">
											<summary className="grid cursor-pointer grid-cols-2 gap-3 px-4 py-4 text-sm text-gray-200 md:grid-cols-6">
												<span className="font-semibold text-white md:col-span-2">{item.itemName}</span>
												<span>In: <span className="text-green-400">{item.inQuantity}</span></span>
												<span>Out: <span className="text-red-400">{item.outQuantity}</span></span>
												<span>Net: <span className={item.netQuantity >= 0 ? 'text-green-400' : 'text-red-400'}>{item.netQuantity}</span></span>
												<span className="text-gray-400">{item.users.length} members</span>
											</summary>
											<div className="border-t border-gray-800 px-4 py-4">
												<table className="min-w-full text-sm">
													<thead className="text-gray-400">
														<tr>
															<th className="px-2 py-2 text-left">Member</th>
															<th className="px-2 py-2 text-left">In</th>
															<th className="px-2 py-2 text-left">Out</th>
															<th className="px-2 py-2 text-left">Net</th>
														</tr>
													</thead>
													<tbody>
														{item.users.map((user) => (
															<tr key={`${item.itemName}-${user.tornId}-${user.userName}`} className="border-t border-gray-800 text-gray-200">
																<td className="px-2 py-2">{user.userName}</td>
																<td className="px-2 py-2 text-green-400">{user.inQuantity}</td>
																<td className="px-2 py-2 text-red-400">{user.outQuantity}</td>
																<td className={`px-2 py-2 ${user.netQuantity >= 0 ? 'text-green-400' : 'text-red-400'}`}>{user.netQuantity}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</details>
									))}
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}