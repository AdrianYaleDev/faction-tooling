import {
  ArmoryItemSummary,
  ArmoryLog,
  ArmoryUserSummary,
  ArmoryUserTotals,
  NormalizedArmoryLog,
} from './definitions';
import { parseArmoryLog } from './parser';

export const ARMORY_CATEGORY_ORDER = ['Armor', 'Weapons', 'Medical', 'Temporary', 'Boosters', 'Tools', 'Other'];

export function normalizeArmoryLog(log: ArmoryLog): NormalizedArmoryLog {
  const parsedLog = parseArmoryLog(log.rawText);
  const resolvedUserName = log.userName ?? parsedLog.actorName ?? `Torn ID ${log.tornId}`;
  const resolvedAction = log.actionType && log.actionType !== 'unknown' ? log.actionType : parsedLog.action;
  const resolvedItemName = log.itemName && log.itemName !== 'unknown' ? log.itemName : parsedLog.item;
  const direction = parsedLog.direction;

  return {
    ...log,
    resolvedUserName,
    resolvedAction,
    resolvedItemName,
    category: parsedLog.category,
    direction,
  };
}

function getDirectionQuantity(log: NormalizedArmoryLog) {
  return {
    inQuantity: log.direction === 'in' ? log.quantity : 0,
    outQuantity: log.direction === 'out' ? log.quantity : 0,
  };
}

export function buildArmoryItemSummaries(logs: ArmoryLog[]): ArmoryItemSummary[] {
  const itemMap = new Map<string, ArmoryItemSummary>();

  for (const rawLog of logs) {
    const log = normalizeArmoryLog(rawLog);
    const itemKey = `${log.category}::${log.resolvedItemName}`;
    const quantities = getDirectionQuantity(log);

    if (!itemMap.has(itemKey)) {
      itemMap.set(itemKey, {
        itemName: log.resolvedItemName,
        category: log.category,
        inQuantity: 0,
        outQuantity: 0,
        netQuantity: 0,
        users: [],
      });
    }

    const itemSummary = itemMap.get(itemKey)!;
    itemSummary.inQuantity += quantities.inQuantity;
    itemSummary.outQuantity += quantities.outQuantity;
    itemSummary.netQuantity = itemSummary.inQuantity - itemSummary.outQuantity;

    let userTotals = itemSummary.users.find((user) => user.userName === log.resolvedUserName && user.tornId === log.tornId);

    if (!userTotals) {
      userTotals = {
        userName: log.resolvedUserName,
        tornId: log.tornId,
        inQuantity: 0,
        outQuantity: 0,
        netQuantity: 0,
      } satisfies ArmoryUserTotals;
      itemSummary.users.push(userTotals);
    }

    userTotals.inQuantity += quantities.inQuantity;
    userTotals.outQuantity += quantities.outQuantity;
    userTotals.netQuantity = userTotals.inQuantity - userTotals.outQuantity;
  }

  return [...itemMap.values()]
    .map((summary) => ({
      ...summary,
      users: summary.users.sort((left, right) => right.outQuantity - left.outQuantity || left.userName.localeCompare(right.userName)),
    }))
    .sort((left, right) => {
      const categoryDelta = ARMORY_CATEGORY_ORDER.indexOf(left.category) - ARMORY_CATEGORY_ORDER.indexOf(right.category);
      if (categoryDelta !== 0) {
        return categoryDelta;
      }

      return left.itemName.localeCompare(right.itemName);
    });
}

export function buildArmoryUserSummaries(logs: ArmoryLog[]): ArmoryUserSummary[] {
  const userMap = new Map<string, ArmoryUserSummary>();

  for (const rawLog of logs) {
    const log = normalizeArmoryLog(rawLog);
    const userKey = `${log.tornId}::${log.resolvedUserName}`;
    const itemKey = `${log.category}::${log.resolvedItemName}`;
    const quantities = getDirectionQuantity(log);

    if (!userMap.has(userKey)) {
      userMap.set(userKey, {
        userName: log.resolvedUserName,
        tornId: log.tornId,
        inQuantity: 0,
        outQuantity: 0,
        netQuantity: 0,
        itemCount: 0,
        items: [],
      });
    }

    const userSummary = userMap.get(userKey)!;
    userSummary.inQuantity += quantities.inQuantity;
    userSummary.outQuantity += quantities.outQuantity;
    userSummary.netQuantity = userSummary.inQuantity - userSummary.outQuantity;

    let itemTotals = userSummary.items.find((item) => `${item.category}::${item.itemName}` === itemKey);

    if (!itemTotals) {
      itemTotals = {
        itemName: log.resolvedItemName,
        category: log.category,
        inQuantity: 0,
        outQuantity: 0,
        netQuantity: 0,
      };
      userSummary.items.push(itemTotals);
    }

    itemTotals.inQuantity += quantities.inQuantity;
    itemTotals.outQuantity += quantities.outQuantity;
    itemTotals.netQuantity = itemTotals.inQuantity - itemTotals.outQuantity;
  }

  return [...userMap.values()]
    .map((summary) => ({
      ...summary,
      itemCount: summary.items.length,
      items: summary.items.sort((left, right) => {
        const categoryDelta = ARMORY_CATEGORY_ORDER.indexOf(left.category) - ARMORY_CATEGORY_ORDER.indexOf(right.category);
        if (categoryDelta !== 0) {
          return categoryDelta;
        }

        return left.itemName.localeCompare(right.itemName);
      }),
    }))
    .sort((left, right) => right.outQuantity - left.outQuantity || left.userName.localeCompare(right.userName));
}