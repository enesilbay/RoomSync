import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EmptyState } from '@/src/components/common';

describe('EmptyState', () => {
  it('başlık ve mesajı gösterir', async () => {
    await render(<EmptyState title="Henüz oda yok" message="İlk odanı oluşturarak başla." />);

    expect(screen.getByText('Henüz oda yok')).toBeOnTheScreen();
    expect(screen.getByText('İlk odanı oluşturarak başla.')).toBeOnTheScreen();
  });

  it('mesaj verilmezse yalnızca başlığı gösterir', async () => {
    await render(<EmptyState title="Boş" />);

    expect(screen.getByText('Boş')).toBeOnTheScreen();
    expect(screen.queryByText('İlk odanı oluşturarak başla.')).not.toBeOnTheScreen();
  });

  it('aksiyon butonuna basınca onAction çağrılır', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="Henüz oda yok" actionText="Oda oluştur" onAction={onAction} />);

    await fireEvent.press(screen.getByText('Oda oluştur'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('onAction yoksa aksiyon butonu render edilmez', async () => {
    await render(<EmptyState title="Henüz oda yok" actionText="Oda oluştur" />);

    expect(screen.queryByText('Oda oluştur')).not.toBeOnTheScreen();
  });
});
