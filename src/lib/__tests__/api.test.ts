type ApiModule = typeof import('@/src/lib/api');
type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage').default;

type ConstantsShape = {
  expoConfig?: { hostUri?: string; extra?: Record<string, unknown> } | null;
  manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } } | null;
  manifest?: { debuggerHost?: string } | null;
};

// Not: expo/no-dynamic-env-var kuralı gereği env değişkenine her yerde statik erişiyoruz.
const originalEnv = process.env.EXPO_PUBLIC_BACKEND_URL;

function setEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
  } else {
    process.env.EXPO_PUBLIC_BACKEND_URL = value;
  }
}

/**
 * `BACKEND_URL` modül yüklenirken bir kez hesaplanır; bu yüzden her senaryo
 * için modülü izole bir kayıt defterinde, verilen `expo-constants` ve env ile
 * yeniden yükleriz.
 */
function loadApi(
  constants: ConstantsShape = {},
  envValue?: string
): { api: ApiModule; AsyncStorage: AsyncStorageModule } {
  setEnv(envValue);

  let api!: ApiModule;
  let AsyncStorage!: AsyncStorageModule;
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: constants }));
    // isolateModules içinde taze modül örneği gerektiği için require kullanılır.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    api = require('@/src/lib/api');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  });
  return { api, AsyncStorage };
}

afterEach(() => {
  jest.dontMock('expo-constants');
  setEnv(originalEnv);
});

describe('BACKEND_URL çözümleme sırası', () => {
  it('1) EXPO_PUBLIC_BACKEND_URL env değişkeni her şeyin önüne geçer', () => {
    const { api } = loadApi(
      {
        expoConfig: {
          hostUri: '192.168.1.20:8081',
          extra: { backendUrl: 'https://extra.example.com' },
        },
      },
      'https://env.example.com'
    );
    expect(api.BACKEND_URL).toBe('https://env.example.com');
  });

  it('2) env yoksa expoConfig.extra.backendUrl kullanılır', () => {
    const { api } = loadApi({
      expoConfig: { hostUri: '192.168.1.20:8081', extra: { backendUrl: 'https://extra.example.com' } },
    });
    expect(api.BACKEND_URL).toBe('https://extra.example.com');
  });

  it('2b) expoConfig yoksa manifest2 içindeki extra.backendUrl kullanılır', () => {
    const { api } = loadApi({
      expoConfig: null,
      manifest2: { extra: { expoClient: { extra: { backendUrl: 'https://manifest2.example.com' } } } },
    });
    expect(api.BACKEND_URL).toBe('https://manifest2.example.com');
  });

  it('string olmayan extra.backendUrl yok sayılır ve dev host yedeğine düşülür', () => {
    const { api } = loadApi({ expoConfig: { hostUri: '10.0.0.7:8081', extra: { backendUrl: 3000 } } });
    expect(api.BACKEND_URL).toBe('http://10.0.0.7:3000');
  });

  it('3) env ve extra yoksa Metro host IP adresi üzerinden 3000 portu kullanılır', () => {
    const { api } = loadApi({ expoConfig: { hostUri: '192.168.1.20:8081' } });
    expect(api.BACKEND_URL).toBe('http://192.168.1.20:3000');
  });

  it('3b) hostUri yoksa eski manifest.debuggerHost kullanılır', () => {
    const { api } = loadApi({ expoConfig: {}, manifest: { debuggerHost: '10.0.0.5:19000' } });
    expect(api.BACKEND_URL).toBe('http://10.0.0.5:3000');
  });

  it.each(['localhost:8081', '127.0.0.1:8081'])('host %s ise localhost yedeğine düşülür', (hostUri) => {
    const { api } = loadApi({ expoConfig: { hostUri } });
    expect(api.BACKEND_URL).toBe('http://localhost:3000');
  });

  it('hiçbir bilgi yoksa http://localhost:3000 kullanılır', () => {
    const { api } = loadApi({});
    expect(api.BACKEND_URL).toBe('http://localhost:3000');
  });

  it('mevcut davranış: boş string env değişkeni `??` nedeniyle kazanır', () => {
    // TODO(Faz 2): boş string yedeğe düşmeli
    const { api } = loadApi(
      { expoConfig: { extra: { backendUrl: 'https://extra.example.com' } } },
      ''
    );
    expect(api.BACKEND_URL).toBe('');
  });
});

describe('apiUrl', () => {
  let api: ApiModule;
  beforeEach(() => {
    ({ api } = loadApi({}, 'https://api.example.com'));
  });

  it('baştaki eğik çizgiyi korur', () => {
    expect(api.apiUrl('/rooms')).toBe('https://api.example.com/rooms');
  });

  it('baştaki eğik çizgi yoksa ekler', () => {
    expect(api.apiUrl('rooms/42')).toBe('https://api.example.com/rooms/42');
  });

  it('sorgu parametrelerini olduğu gibi bırakır', () => {
    expect(api.apiUrl('/users?q=ali&page=2')).toBe('https://api.example.com/users?q=ali&page=2');
  });

  it('boş path kök adresi verir', () => {
    expect(api.apiUrl('')).toBe('https://api.example.com/');
  });
});

describe('assetUrl', () => {
  let api: ApiModule;
  beforeEach(() => {
    ({ api } = loadApi({}, 'https://api.example.com'));
  });

  it.each([null, undefined, ''])('%p için null döner', (value) => {
    expect(api.assetUrl(value)).toBeNull();
  });

  it.each(['http://cdn.example.com/a.png', 'https://cdn.example.com/a.png'])(
    'mutlak URL %s olduğu gibi döner',
    (url) => {
      expect(api.assetUrl(url)).toBe(url);
    }
  );

  it('göreli yolu backend adresine bağlar (eğik çizgili / eğik çizgisiz)', () => {
    expect(api.assetUrl('/uploads/avatar.png')).toBe('https://api.example.com/uploads/avatar.png');
    expect(api.assetUrl('uploads/avatar.png')).toBe('https://api.example.com/uploads/avatar.png');
  });
});

describe('getAuthHeaders', () => {
  it('token varsa Bearer Authorization başlığı döner', async () => {
    const { api, AsyncStorage } = loadApi({}, 'https://api.example.com');
    await AsyncStorage.setItem('access_token', 'abc.def.ghi');

    await expect(api.getAuthHeaders()).resolves.toEqual({ Authorization: 'Bearer abc.def.ghi' });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('access_token');
  });

  it('token yoksa boş nesne döner', async () => {
    const { api, AsyncStorage } = loadApi({}, 'https://api.example.com');
    await AsyncStorage.clear();

    await expect(api.getAuthHeaders()).resolves.toEqual({});
  });
});
