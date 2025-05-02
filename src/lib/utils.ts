import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Groups and orders inventory items by date, with expenses above sales for each date.
 * @param items InventoryItem[]
 * @returns InventoryItem[]
 */
export function groupAndOrderInventoryItems(items) {
  // Group by date
  const groups = {};
  items.forEach(item => {
    let dateKey = item.date;
    if (/\d{4}-\d{2}-\d{2}/.test(dateKey)) {
      const [y, m, d] = dateKey.split('-');
      dateKey = `${d}/${m}/${y}`;
    }
    groups[dateKey] = groups[dateKey] || [];
    groups[dateKey].push(item);
  });
  // Sort dates descending (latest first)
  const sortedDates = Object.keys(groups).sort((a, b) => {
    const parse = (str) => {
      if (/\d{2}\/\d{2}\/\d{4}/.test(str)) {
        const [d, m, y] = str.split('/');
        return new Date(`${y}-${m}-${d}`);
      } else if (/\d{4}-\d{2}-\d{2}/.test(str)) {
        return new Date(str);
      }
      return new Date(str);
    };
    return parse(b).getTime() - parse(a).getTime();
  });
  // For each date, put expenses first, then sales
  const ordered = [];
  sortedDates.forEach(date => {
    const items = groups[date];
    ordered.push(...items.filter(i => !i.isSale));
    ordered.push(...items.filter(i => i.isSale));
  });
  return ordered;
}
