// Jest ortamı için global mock'lar (her test dosyasından önce çalışır).
// jest.mock fabrikaları dış kapsamdaki import'lara erişemez; require zorunlu.
/* eslint-disable @typescript-eslint/no-require-imports */

// AsyncStorage: resmi bellek içi mock. Mock dosyası CommonJS olarak nesneyi
// doğrudan export ettiği için `import AsyncStorage from ...` ile aynı nesneye
// ulaşılsın diye `default` alanını da sağlıyoruz.
jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
  return { __esModule: true, default: mock, ...mock };
});

// İkon setleri: testlerde font yüklemeye gerek yok; her ikon, adını testID
// olarak taşıyan boş bir <Text> olarak render edilir.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) =>
    React.createElement(Text, { testID: `icon-${name}` });
  // Her ikon seti (FontAwesome5, Ionicons, ...) aynı sahte bileşeni döndürür.
  return new Proxy({ __esModule: true } as Record<string | symbol, unknown>, {
    get: (target, key) => (key in target ? target[key] : Icon),
  });
});
