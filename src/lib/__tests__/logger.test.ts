import { logger } from '@/src/lib/logger';

const globalWithDev = globalThis as unknown as { __DEV__: boolean };

const methods = [
  ['debug', 'log'],
  ['info', 'info'],
  ['warn', 'warn'],
  ['error', 'error'],
] as const;

describe('logger', () => {
  const originalDev = globalWithDev.__DEV__;

  afterEach(() => {
    globalWithDev.__DEV__ = originalDev;
  });

  describe('__DEV__ true iken', () => {
    beforeEach(() => {
      globalWithDev.__DEV__ = true;
    });

    it.each(methods)('logger.%s → console.%s (tüm argümanlarla)', (method, consoleMethod) => {
      const spy = jest.spyOn(console, consoleMethod).mockImplementation(() => {});
      const payload = { id: 1 };

      logger[method]('mesaj', payload, 42);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('mesaj', payload, 42);
    });
  });

  describe('__DEV__ false iken (production)', () => {
    beforeEach(() => {
      globalWithDev.__DEV__ = false;
    });

    it.each(methods)('logger.%s console.%s çağırmaz', (method, consoleMethod) => {
      const spy = jest.spyOn(console, consoleMethod).mockImplementation(() => {});

      logger[method]('gizli mesaj');

      expect(spy).not.toHaveBeenCalled();
    });

    it('logger.error hata fırlatmaz', () => {
      expect(() => logger.error(new Error('boom'))).not.toThrow();
    });
  });
});
