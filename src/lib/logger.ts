/**
 * Uygulama genelinde kullanılan basit logger.
 *
 * - Yalnızca geliştirme modunda (`__DEV__`) konsola yazar; production
 *   build'lerinde hiçbir çıktı üretmez.
 * - `debug` -> console.log, `info` -> console.info,
 *   `warn` -> console.warn, `error` -> console.error.
 */

type LogArgs = unknown[];

function reportError(..._args: LogArgs): void {
  // TODO(Faz 7): Sentry — production hatalarını burada Sentry'ye ilet.
}

export const logger = {
  debug(...args: LogArgs): void {
    if (__DEV__) console.log(...args);
  },
  info(...args: LogArgs): void {
    if (__DEV__) console.info(...args);
  },
  warn(...args: LogArgs): void {
    if (__DEV__) console.warn(...args);
  },
  error(...args: LogArgs): void {
    if (__DEV__) console.error(...args);
    reportError(...args);
  },
};
