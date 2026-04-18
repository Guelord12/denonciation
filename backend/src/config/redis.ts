// =====================================================
// REDIS CONFIGURATION - DÉSACTIVÉ COMPLÈTEMENT
// =====================================================

import { logger } from '../utils/logger';

// ✅ Client Redis MOCK - Toutes les méthodes retournent des valeurs par défaut
const createMockRedisClient = () => {
  const mockClient: any = {
    isOpen: false,
    connected: false,
    
    // Méthodes mock qui retournent toujours des valeurs par défaut
    sCard: async () => 0,
    hLen: async () => 0,
    get: async () => null,
    set: async () => null,
    hSet: async () => null,
    hGet: async () => null,
    hDel: async () => null,
    sAdd: async () => null,
    sRem: async () => null,
    del: async () => null,
    expire: async () => null,
    flushAll: async () => null,
    
    // Méthodes de connexion mock
    connect: async () => { logger.info('📦 Mock Redis (désactivé)'); },
    disconnect: async () => {},
    on: () => {},
    hGetAll: async () => ({}),
    hVals: async () => [],
    sMembers: async () => [],
    incr: async () => 1,
    decr: async () => 0,
    exists: async () => 0,
  };
  return mockClient;
};

// ✅ Client Redis désactivé (mock)
export const redisClient = createMockRedisClient();

// ✅ Fonction d'initialisation (ne fait rien)
export async function initializeRedis(): Promise<void> {
  logger.info('📦 Redis is DISABLED - using mock client (no-op)');
  logger.info('   All Redis operations will return default values');
  return Promise.resolve();
}

export default redisClient;