import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { logger } from '@/src/lib/logger';

const globalWithDev = globalThis as unknown as { __DEV__: boolean };

describe('AppErrorBoundary', () => {
  const originalDev = globalWithDev.__DEV__;

  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalWithDev.__DEV__ = originalDev;
  });

  it('Türkçe başlığı ve açıklamayı gösterir, hatayı logger.error ile kaydeder', () => {
    const error = new Error('patladı');
    render(<AppErrorBoundary error={error} retry={jest.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Bir şeyler ters gitti')).toBeOnTheScreen();
    expect(screen.getByText(/Beklenmedik bir hata oluştu/)).toBeOnTheScreen();
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), error);
  });

  it('"Tekrar dene" butonu erişilebilir ve retry çağırır', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    render(<AppErrorBoundary error={new Error('x')} retry={retry} />);

    fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(retry).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Tekrar dene')).toBeOnTheScreen());
  });

  it('__DEV__ true iken hata mesajını gösterir', () => {
    globalWithDev.__DEV__ = true;
    render(<AppErrorBoundary error={new Error('gizli ayrıntı')} retry={jest.fn()} />);

    expect(screen.getByText(/gizli ayrıntı/)).toBeOnTheScreen();
  });

  it('__DEV__ false iken (production) hata mesajını gizler', () => {
    globalWithDev.__DEV__ = false;
    render(<AppErrorBoundary error={new Error('gizli ayrıntı')} retry={jest.fn()} />);

    expect(screen.queryByText(/gizli ayrıntı/)).not.toBeOnTheScreen();
    expect(screen.queryByTestId('error-boundary-dev-details')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeOnTheScreen();
  });
});
