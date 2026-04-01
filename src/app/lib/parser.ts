function categorizeArmoryItem(itemName: string, plainText: string) {
  const normalizedItem = itemName.toLowerCase();
  const normalizedText = plainText.toLowerCase();

  const armorKeywords = [
    'helmet', 'vest', 'pants', 'gloves', 'boots', 'body', 'riot', 'assault', 'combat', 'armor', 'armour',
  ];
  const weaponKeywords = [
    'rifle', 'shotgun', 'smg', 'pistol', 'revolver', 'grenade', 'launcher', 'katana', 'sword', 'knife', 'mace',
  ];
  const medicalKeywords = ['first aid', 'morphine', 'blood bag', 'med kit', 'medical', 'epi', 'anesthetic'];
  const temporaryKeywords = ['flash', 'smoke', 'tear gas', 'pepper spray', 'molotov', 'temporary'];
  const boosterKeywords = ['energy drink', 'can', 'booster', 'xanax', 'ecstasy', 'lsd'];
  const toolKeywords = ['detector', 'camera', 'binoculars', 'wire', 'tool', 'jerry can'];

  if (armorKeywords.some((keyword) => normalizedItem.includes(keyword))) {
    return 'Armor';
  }

  if (weaponKeywords.some((keyword) => normalizedItem.includes(keyword))) {
    return 'Weapons';
  }

  if (medicalKeywords.some((keyword) => normalizedItem.includes(keyword)) || normalizedText.includes("medical items")) {
    return 'Medical';
  }

  if (temporaryKeywords.some((keyword) => normalizedItem.includes(keyword)) || normalizedText.includes("temporary items")) {
    return 'Temporary';
  }

  if (boosterKeywords.some((keyword) => normalizedItem.includes(keyword)) || normalizedText.includes("booster items")) {
    return 'Boosters';
  }

  if (toolKeywords.some((keyword) => normalizedItem.includes(keyword))) {
    return 'Tools';
  }

  return 'Other';
}

export function parseArmoryLog(htmlString: string) {
  // 1. Get Torn ID
  const idMatch = htmlString.match(/XID=(\d+)/);
  const tornId = idMatch ? parseInt(idMatch[1]) : 0;

  // 2. Strip HTML
  const plainText = htmlString.replace(/<[^>]*>/g, '').trim();

  // 3. Extract Quantity (e.g., "1x" or "5x")
  const qtyMatch = plainText.match(/(\d+)x/);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  const actorMatch = plainText.match(/^(.+?)\s+(loaned|used|returned|retrieved|gave)\b/i);
  const actorName = actorMatch ? actorMatch[1].trim() : null;

  let action = 'unknown';
  let item = 'unknown';
  let direction: 'in' | 'out' | 'unknown' = 'unknown';

  // 4. Pattern Matching for Actions
  if (plainText.includes("loaned")) {
    action = 'loaned';
    direction = 'out';
    // Logic: Grab text between "loaned [qty]x" and "to themselves" or "from"
    const start = plainText.indexOf('loaned') + 6;
    const end = plainText.includes('to themselves') 
                ? plainText.indexOf('to themselves') 
                : plainText.indexOf('from the');
    item = plainText.substring(start, end).replace(/\d+x/, '').trim();
  } 
  else if (plainText.includes("used one of the faction's")) {
    action = 'used';
    direction = 'out';
    item = plainText.split("faction's")[1].replace('items', '').trim();
  }
  else if (plainText.includes("returned")) {
    action = 'returned';
    direction = 'in';
    item = plainText.split('returned')[1].split('to the')[0].replace(/\d+x/, '').trim();
  }
  else if (plainText.includes('retrieved')) {
    action = 'retrieved';
    direction = 'out';
    item = plainText.split('retrieved')[1].split('from')[0].replace(/\d+x/, '').trim();
  }
  else if (plainText.includes('gave')) {
    action = 'gave';
    direction = 'out';
    item = plainText.split('gave')[1].split('to')[0].replace(/\d+x/, '').trim();
  }

  const category = categorizeArmoryItem(item, plainText);

  return { tornId, actorName, action, item, quantity, plainText, category, direction };
}