export const startButtons = [
  { name: '🛍️ Наши услуги', callback_data: 'categories' },
  // { name: '🧾 Заказы', callback_data: 'orders' },
  { name: '🧺 Корзина', callback_data: 'cart' },
  { name: '🏠 Начало', callback_data: 'start' },
  { name: '❓ Помощь', callback_data: 'support' },
] as const;

export type StartButton = (typeof startButtons)[number]['name'];

export const startButtonNames = new Set(startButtons.map((b) => b.name));
