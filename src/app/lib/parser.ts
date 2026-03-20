export function parseArmoryLog(htmlString: string) {
  // 1. Get Torn ID
  const idMatch = htmlString.match(/XID=(\d+)/);
  const tornId = idMatch ? parseInt(idMatch[1]) : 0;

  // 2. Strip HTML
  const plainText = htmlString.replace(/<[^>]*>/g, '').trim();

  // 3. Extract Quantity (e.g., "1x" or "5x")
  const qtyMatch = plainText.match(/(\d+)x/);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  let action = 'unknown';
  let item = 'unknown';

  // 4. Pattern Matching for Actions
  if (plainText.includes("loaned")) {
    action = 'loaned';
    // Logic: Grab text between "loaned [qty]x" and "to themselves" or "from"
    const start = plainText.indexOf('loaned') + 6;
    const end = plainText.includes('to themselves') 
                ? plainText.indexOf('to themselves') 
                : plainText.indexOf('from the');
    item = plainText.substring(start, end).replace(/\d+x/, '').trim();
  } 
  else if (plainText.includes("used one of the faction's")) {
    action = 'used';
    item = plainText.split("faction's")[1].replace('items', '').trim();
  }
  else if (plainText.includes("returned")) {
    action = 'returned';
    item = plainText.split('returned')[1].split('to the')[0].trim();
  }

  return { tornId, action, item, quantity, plainText };
}