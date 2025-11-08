import { Order } from 'src/domain/order/entities/order.entity';

export function generateCkassaNumber(order: Order) {
  const uuidPart = order.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const timePart = order.createdAt.getTime().toString().slice(-6);
  return `${uuidPart}${timePart}`;
}
