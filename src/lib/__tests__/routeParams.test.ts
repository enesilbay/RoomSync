import { toRouteParams } from '@/src/lib/routeParams';

describe('toRouteParams', () => {
  it('string ve number değerleri olduğu gibi korur', () => {
    expect(toRouteParams({ id: 'abc', count: 3, zero: 0, empty: '', ratio: 1.5 })).toEqual({
      id: 'abc',
      count: 3,
      zero: 0,
      empty: '',
      ratio: 1.5,
    });
  });

  it("boolean değerleri 'true' / 'false' string'ine çevirir", () => {
    expect(toRouteParams({ isPremium: true, isOnline: false })).toEqual({
      isPremium: 'true',
      isOnline: 'false',
    });
  });

  it('null, undefined, nesne, dizi ve fonksiyonları atlar', () => {
    expect(
      toRouteParams({
        keep: 'yes',
        nothing: null,
        missing: undefined,
        nested: { a: 1 },
        list: [1, 2],
        fn: () => 1,
        date: new Date(0),
      })
    ).toEqual({ keep: 'yes' });
  });

  it('null veya undefined kaynakta boş nesne döner', () => {
    expect(toRouteParams(null)).toEqual({});
    expect(toRouteParams(undefined)).toEqual({});
  });

  it('kaynak nesneyi değiştirmez ve yeni bir nesne döner', () => {
    const source = { id: 'x', flag: true };
    const params = toRouteParams(source);
    expect(params).not.toBe(source);
    expect(source).toEqual({ id: 'x', flag: true });
  });
});
