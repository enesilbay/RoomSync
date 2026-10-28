#!/usr/bin/env node
/**
 * Expo Router typed routes tiplerini (.expo/types/router.d.ts) dev server
 * açmadan, etkileşimsiz olarak üretir. CI'da (Linux) ve yerelde çalışır.
 *
 * `expo start` bu dosyayı @expo/cli -> @expo/router-server/build/typed-routes
 * üzerinden üretir (SDK 55+; öncesinde expo-router/build/typed-routes). Burada
 * aynı üreticiyi (getTypedRoutesDeclarationFile) aynı require.context
 * ponyfill'i (expo-router/internal/testing) ve aynı ignore regex'i ile
 * doğrudan çağırıyoruz; böylece çıktı `expo start`ın ürettiğiyle birebir aynıdır.
 *
 * Ayrıca `expo start`ın yaptığı gibi eksikse `expo-env.d.ts` dosyasını yazar
 * (gitignore'da olduğu için CI'da bulunmaz, tsconfig onu include eder).
 *
 * Kullanım: npm run typegen
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function resolveFromProject(id) {
  return require.resolve(id, { paths: [projectRoot] });
}

// @expo/config ve @expo/cli, `expo` paketinin bağımlılığıdır; onun konumundan çözümle.
function resolveFromExpo(id) {
  const expoPkgDir = path.dirname(resolveFromProject('expo/package.json'));
  return require.resolve(id, { paths: [expoPkgDir, projectRoot] });
}

// @expo/router-server, @expo/cli'nin bağımlılığıdır; CLI ile aynı kopyayı kullan.
function resolveFromExpoCli(id) {
  const cliPkgDir = path.dirname(resolveFromExpo('@expo/cli/package.json'));
  return require.resolve(id, { paths: [cliPkgDir, projectRoot] });
}

function loadExpoConfig() {
  const configPath = resolveFromExpo('@expo/config');
  const { getConfig } = require(configPath);
  return getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp;
}

function getRouterDirectory(exp) {
  // @expo/cli getRouterDirectoryModuleIdWithManifest ile aynı mantık.
  const configured = exp.extra?.router?.root;
  if (configured != null) {
    return path.isAbsolute(configured) ? configured : path.resolve(projectRoot, configured);
  }
  const srcApp = path.join(projectRoot, 'src', 'app');
  if (fs.existsSync(srcApp) && fs.statSync(srcApp).isDirectory()) return srcApp;
  return path.join(projectRoot, 'app');
}

function main() {
  const exp = loadExpoConfig();
  if (!exp.experiments?.typedRoutes) {
    console.log('[typegen] experiments.typedRoutes kapalı; atlanıyor.');
    return;
  }

  const routerDirectory = getRouterDirectory(exp);
  // expo-router, Node'da çalışırken uygulama kökünü bu ortam değişkeninden okur.
  process.env.EXPO_ROUTER_APP_ROOT = routerDirectory;

  const { EXPO_ROUTER_CTX_IGNORE } = require(resolveFromProject('expo-router/_ctx-shared'));
  const { requireContext } = require(resolveFromProject('expo-router/internal/testing'));
  const { getTypedRoutesDeclarationFile } = require(
    resolveFromExpoCli('@expo/router-server/build/typed-routes/generate')
  );

  const ctx = requireContext(routerDirectory, true, EXPO_ROUTER_CTX_IGNORE);
  const file = getTypedRoutesDeclarationFile(ctx, exp.extra?.router ?? {});
  if (!file) {
    throw new Error('[typegen] router.d.ts üretilemedi (boş çıktı).');
  }

  const typesDirectory = path.join(projectRoot, '.expo', 'types');
  fs.mkdirSync(typesDirectory, { recursive: true });
  fs.writeFileSync(path.join(typesDirectory, 'router.d.ts'), file);

  const expoEnvPath = path.join(projectRoot, 'expo-env.d.ts');
  if (!fs.existsSync(expoEnvPath)) {
    fs.writeFileSync(
      expoEnvPath,
      '/// <reference types="expo/types" />\n\n// NOTE: This file should not be edited and should be in your git ignore'
    );
  }

  console.log(
    `[typegen] ${path.relative(projectRoot, path.join(typesDirectory, 'router.d.ts'))} üretildi ` +
      `(${ctx.keys().length} dosya, kök: ${path.relative(projectRoot, routerDirectory)}).`
  );
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
