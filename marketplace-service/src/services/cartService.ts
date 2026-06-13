import prisma from '../infrastructure/database/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          listing: {
            include: { seller: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            listing: {
              include: { seller: { select: { fullName: true } } },
            },
          },
        },
      },
    });
  }

  return cart;
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const total = cart.items.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);

  return {
    items: cart.items.map((item) => ({
      id: item.id,
      listingId: item.listingId,
      title: item.listing.title,
      price: item.listing.price,
      unit: item.listing.unit,
      quantity: item.quantity,
      subtotal: item.listing.price * item.quantity,
      seller: item.listing.seller.fullName,
      imageUrl: item.listing.imageUrl,
    })),
    itemCount: cart.items.length,
    total: Math.round(total * 100) / 100,
  };
}

export async function addToCart(userId: string, listingId: string, quantity: number) {
  if (quantity <= 0) throw new ValidationError('Quantity must be positive');

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError('Listing not found');

  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.upsert({
    where: { cartId_listingId: { cartId: cart.id, listingId } },
    create: { cartId: cart.id, listingId, quantity },
    update: { quantity: { increment: quantity } },
  });

  return getCart(userId);
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError('Cart item not found');

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  return getCart(userId);
}

export async function removeFromCart(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError('Cart item not found');

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { success: true, itemCount: 0, total: 0 };
}
