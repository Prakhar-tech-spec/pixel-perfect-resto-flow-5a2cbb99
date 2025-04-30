export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface InventoryItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  paymentMode: string;
  notes: string;
  date: string;
} 