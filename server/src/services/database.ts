import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
});

export const db = {
  // Product operations
  async createProduct(data: {
    name: string;
    shop: string;
    currentPrice: number;
    originalPrice: number;
    image: string;
    userId?: string;
  }) {
    return prisma.product.create({
      data: {
        ...data,
        change: 0,
      },
    });
  },

  async getAllProducts(userId?: string) {
    return prisma.product.findMany({
      where: userId ? { userId } : undefined,
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async updateProductPrice(
    productId: number,
    newPrice: number,
    shop: string,
    isLowest: boolean
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) return null;

    const priceChange = ((newPrice - product.currentPrice) / product.currentPrice) * 100;

    // Update product
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        currentPrice: newPrice,
        shop,
        isLowest,
        change: priceChange,
      },
    });

    // Add to price history
    await prisma.priceHistory.create({
      data: {
        productId,
        price: newPrice,
        shop,
      },
    });

    // Create alert if price dropped significantly (>5%)
    if (priceChange < -5) {
      await prisma.alert.create({
        data: {
          productId,
          productName: product.name,
          image: product.image,
          oldPrice: product.currentPrice,
          newPrice: newPrice,
          discount: Math.abs(priceChange),
          shop,
          userId: product.userId,
        },
      });
    }

    return updated;
  },

  async deleteProduct(productId: number) {
    return prisma.product.delete({
      where: { id: productId },
    });
  },

  // Alert operations
  async getUnreadAlerts(userId?: string) {
    return prisma.alert.findMany({
      where: {
        isRead: false,
        userId: userId || undefined,
      },
      orderBy: { timestamp: 'desc' },
    });
  },

  async markAlertAsRead(alertId: number) {
    return prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  },

  async clearAllAlerts(userId?: string) {
    return prisma.alert.deleteMany({
      where: userId ? { userId } : undefined,
    });
  },

  // User operations
  async createUser(data: { id: string; email: string; name?: string }) {
    return prisma.user.create({
      data,
    });
  },

  async updateFcmToken(userId: string, fcmToken: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  },
};

export default prisma;
