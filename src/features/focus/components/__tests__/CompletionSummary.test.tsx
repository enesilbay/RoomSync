import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SessionSummary } from '../../engine/types';
import { CompletionSummary } from '../CompletionSummary';

const base: SessionSummary = {
  startedAt: 1_700_000_000_000,
  endedAt: 1_700_000_000_000 + 30 * 60_000,
  plannedMs: 25 * 60_000,
  focusedMs: 25 * 60_000,
  glanceMs: 20_000,
  breakMs: 4 * 60_000 + 40_000,
  pickups: 3,
  breaks: 1,
  mode: 'flexible',
  completed: true,
  focusQuality: 84,
};

describe('CompletionSummary', () => {
  it('tamamlanan oturumun özetini gösterir', async () => {
    await render(<CompletionSummary summary={base} onNewSession={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Tamamlandı')).toBeTruthy();
    expect(screen.queryByText('Erken bitirildi')).toBeNull();
    expect(screen.getByLabelText('Odaklanılan süre: 25 dk')).toBeTruthy();
    expect(screen.getByLabelText('Planlanan süre: 25 dk')).toBeTruthy();
    expect(screen.getByLabelText('Telefonu kaldırma: 3 kez')).toBeTruthy();
    expect(screen.getByLabelText('Mola: 1 kez · 4 dk 40 sn')).toBeTruthy();
    expect(screen.getByLabelText('Odak kalitesi: %84')).toBeTruthy();
  });

  it('erken bitirileni ayırır; Yeni oturum ve Kapat çağrılır', async () => {
    const onNewSession = jest.fn();
    const onClose = jest.fn();
    await render(
      <CompletionSummary
        summary={{ ...base, completed: false, focusedMs: 12 * 60_000 + 5_000, breaks: 0, breakMs: 0 }}
        onNewSession={onNewSession}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('Erken bitirildi')).toBeTruthy();
    expect(screen.getByLabelText('Odaklanılan süre: 12 dk 5 sn')).toBeTruthy();
    expect(screen.getByLabelText('Mola: Yok')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni oturum' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('özet yokken hiçbir şey göstermez', async () => {
    await render(<CompletionSummary summary={null} onNewSession={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText('Tamamlandı')).toBeNull();
    expect(screen.queryByText('Erken bitirildi')).toBeNull();
  });
});
