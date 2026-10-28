import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '@/src/lib/api';
import type {
  AtmosphereUpdatedPayload,
  ChatMessage,
  DuelEndedPayload,
  DuelReceivedPayload,
  DuelStartedPayload,
  NudgeReceivedPayload,
  RoomUser,
  ScoreUpdatedPayload,
  SearchParam,
  SocketErrorPayload,
  SocketRef,
} from '../types';

type Options = {
  socketRef: SocketRef;
  roomName: SearchParam;
  isFocused: boolean;
  safeFullName: string;
  maxUsers: SearchParam;
  myUserId: number;
  initialScore: number;
  isPremium: boolean;
  volumes: Record<string, number>;
  setChatList: Dispatch<SetStateAction<ChatMessage[]>>;
  setVolumes: Dispatch<SetStateAction<Record<string, number>>>;
  showNudgeToast: (senderName: string, message: string) => void;
};

// Oda socket'i: bağlantı, olay dinleyicileri ve odaya giden olaylar (dürtme, düello, atmosfer).
export function useRoomSocket({
  socketRef,
  roomName,
  isFocused,
  safeFullName,
  maxUsers,
  myUserId,
  initialScore,
  isPremium,
  volumes,
  setChatList,
  setVolumes,
  showNudgeToast,
}: Options) {
  const [totalScore, setTotalScore] = useState(initialScore);
  const [isConnected, setIsConnected] = useState(true);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);

  // Socket dinleyicileri en güncel değerleri bu ref'ten okur; böylece bu değerler
  // değiştiğinde socket yeniden bağlanmaz (yalnızca oda/odak değişince bağlanır).
  const latestRef = useRef({ safeFullName, maxUsers, myUserId, showNudgeToast });
  useEffect(() => {
    latestRef.current = { safeFullName, maxUsers, myUserId, showNudgeToast };
  });

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      socketRef.current = io(BACKEND_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current.on('connect', () => {
        setIsConnected(true);
        socketRef.current?.emit('join_lobby', { roomName, fullName: latestRef.current.safeFullName, maxUsers: latestRef.current.maxUsers });
      });
      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });

      socketRef.current.on('room_users', (users: RoomUser[]) => {
        setRoomUsers(users);
        const me = users.find(u => Number(u.userId) === latestRef.current.myUserId);
        if (me && typeof me.score === 'number') setTotalScore(me.score);
      });

      socketRef.current.on('receive_message', (msg: ChatMessage) => {
        setChatList(prev => [...prev, msg]);
      });

      socketRef.current.on('score_updated', (data: ScoreUpdatedPayload) => {
        if (Number(data.userId) === latestRef.current.myUserId) setTotalScore(data.newTotal);
      });

      // Dürtme (Nudge) alındığında toast göster
      socketRef.current.on('nudge_received', (data: NudgeReceivedPayload) => {
        latestRef.current.showNudgeToast(data.senderName, data.message);
      });

      // AŞAMA 4: DÜELLO
      socketRef.current.on('duel_received', (data: DuelReceivedPayload) => {
        Alert.alert(
          '⚔️ Düello Teklifi!',
          `${data.challengerName} sana ${data.betAmount} Odak Puanlık bir düello teklif etti! Kabul edersen masadan telefonunu ilk kaldıran kaybeder. Kabul ediyor musun?`,
          [
            { text: 'Reddet', style: 'cancel' },
            {
              text: 'Kabul Et',
              onPress: () => {
                socketRef.current?.emit('accept_duel', { duelId: data.duelId });
              }
            }
          ]
        );
      });

      socketRef.current.on('duel_started', (data: DuelStartedPayload) => {
        Alert.alert('⚔️ Düello Başladı!', `${data.opponentName} ile düellodasın! Telefonu masadan ilk kaldıran ${data.betAmount} puan kaybeder.`);
      });

      socketRef.current.on('duel_ended', (data: DuelEndedPayload) => {
        if (data.winner) {
          Alert.alert('🏆 Düelloyu Kazandın!', `Tebrikler! ${data.opponentName} pes etti. ${data.betAmount * 2} puan kazandın!`);
        } else {
          Alert.alert('💀 Düelloyu Kaybettin!', `Odaktan koptun! ${data.betAmount} puan kaybettin.`);
        }
      });

      socketRef.current.on('error', (data: SocketErrorPayload) => {
        Alert.alert('Uyarı', data.message);
      });

      socketRef.current.on('atmosphere_updated', (data: AtmosphereUpdatedPayload) => {
        Alert.alert(
          '🎵 Atmosfer Senkronu',
          `${data.ownerName} odanın atmosferini paylaştı. Bu ses ayarlarını kendi cihazına uygulamak ister misin?`,
          [
            { text: 'Hayır', style: 'cancel' },
            {
              text: 'Uygula',
              onPress: () => {
                setVolumes(data.volumes);
                Alert.alert('Başarılı', 'Atmosfer senkronize edildi!');
              }
            }
          ]
        );
      });
    };
    if (isFocused) {
      initSocket();
    }

    return () => { socketRef.current?.disconnect(); };
  }, [roomName, isFocused, socketRef, setChatList, setVolumes]);

  // Nudge: Odadaki bir kullanıcıya dürtme gönder
  const sendNudge = (targetUserId: number, targetName: string) => {
    if (targetUserId === myUserId) return;
    socketRef.current?.emit('nudge_friend', {
      targetUserId,
      senderName: safeFullName,
      roomName,
    });
    Alert.alert('Davet gönderildi', `${targetName} ${roomName} odasına çağrıldı.`);
  };

  const challengeDuel = (targetId: number, targetName: string) => {
    if (targetId === myUserId) return;
    Alert.alert(
      '⚔️ Düello İsteği',
      `${targetName} adlı kullanıcıya düello isteği göndermek istediğine emin misin? (Bahis: 50 Puan)`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Gönder', onPress: () => {
            socketRef.current?.emit('challenge_duel', {
              targetUserId: targetId,
              betAmount: 50,
              roomName: roomName
            });
        }}
      ]
    );
  };

  const broadcastAtmosphere = () => {
    if (!isPremium) return;
    socketRef.current?.emit('broadcast_atmosphere', {
      volumes,
      roomName
    });
    Alert.alert('🎵 Yayınlandı', 'Ses ayarların odadaki diğer kullanıcılarla paylaşıldı!');
  };

  return { totalScore, isConnected, roomUsers, sendNudge, challengeDuel, broadcastAtmosphere };
}
