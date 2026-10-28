import type { MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';

// Rota parametresi: Expo Router string ya da string[] döndürür; parametre hiç gelmeyebilir.
export type SearchParam = string | string[] | undefined;

export type SocketRef = MutableRefObject<Socket | null>;

export type SoundOption = {
  key: string;
  label: string;
  icon: string;
  /** `require()` ile yüklenen ses dosyası (Metro asset id). */
  file: number;
};

export type Friend = {
  id: number;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  equippedProfileFrame?: string;
  isOnline?: boolean;
  currentRoom?: string | null;
};

export type ChatMessage = {
  userId?: number;
  fullName?: string;
  avatarUrl?: string;
  equippedProfileFrame?: string;
  text?: string;
  type?: string;
  fileUrl?: string;
  isPremium?: boolean;
  equippedBubbleColor?: string | null;
  equippedIcon?: string | null;
};

/** `/messages/:roomName` geçmişindeki ham mesaj. */
export type ApiMessage = {
  text?: string;
  type?: string;
  fileUrl?: string;
  user?: {
    id?: number;
    fullName?: string;
    avatarUrl?: string;
    equippedProfileFrame?: string;
    isPremium?: boolean;
    equippedBubbleColor?: string | null;
    equippedIcon?: string | null;
  };
};

export type RoomUser = {
  userId: number | string;
  fullName?: string;
  avatarUrl?: string;
  equippedProfileFrame?: string;
  isAtDesk?: boolean;
  score?: number;
};

export type NudgeToastState = { message: string; senderName: string };

// ── Socket olay yükleri ──
export type ScoreUpdatedPayload = { userId: number | string; newTotal: number };
export type NudgeReceivedPayload = { senderName: string; message: string };
export type DuelReceivedPayload = { duelId: number | string; challengerName: string; betAmount: number };
export type DuelStartedPayload = { opponentName: string; betAmount: number };
export type DuelEndedPayload = { winner: boolean; opponentName: string; betAmount: number };
export type SocketErrorPayload = { message: string };
export type AtmosphereUpdatedPayload = { ownerName: string; volumes: Record<string, number> };
