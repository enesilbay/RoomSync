import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { FLAT_AXIS_THRESHOLD, FLAT_Z_THRESHOLD } from '../constants';
import type { SearchParam, SocketRef } from '../types';

type Options = {
  isFocused: boolean;
  appActive: boolean;
  focusRequested: boolean;
  roomName: SearchParam;
  socketRef: SocketRef;
  isAtDesk: boolean;
  setIsAtDesk: Dispatch<SetStateAction<boolean>>;
  previousDeskState: MutableRefObject<boolean | null>;
};

// İvmeölçerle "telefon masada" algılama; durum değişince odaya update_presence gönderilir.
export function useDeskDetection({
  isFocused,
  appActive,
  focusRequested,
  roomName,
  socketRef,
  isAtDesk,
  setIsAtDesk,
  previousDeskState,
}: Options) {
  const [isPhoneFaceDownOnDesk, setIsPhoneFaceDownOnDesk] = useState(false);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    if (isFocused && appActive) {
      if (Platform.OS === 'web') {
        sub = { remove: () => {} };
      } else {
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const isPhoneFaceDown =
            z < -FLAT_Z_THRESHOLD &&
            Math.abs(x) < FLAT_AXIS_THRESHOLD &&
            Math.abs(y) < FLAT_AXIS_THRESHOLD;
          const isPhoneFlat =
            Math.abs(z) > FLAT_Z_THRESHOLD &&
            Math.abs(x) < FLAT_AXIS_THRESHOLD &&
            Math.abs(y) < FLAT_AXIS_THRESHOLD;
          const flat = isPhoneFlat && focusRequested; // Odak istendiğinde telefon iki yönde de masadaysa odaklanma başlar
          setIsPhoneFaceDownOnDesk(isPhoneFaceDown);

          if (flat) {
            if (previousDeskState.current !== true) {
              setIsAtDesk(true);
              if (socketRef.current?.connected) {
                socketRef.current.emit('update_presence', { isAtDesk: true, roomName });
              }
              previousDeskState.current = true;
            }
          } else {
            if (previousDeskState.current === true) {
              setIsAtDesk(false);
              if (socketRef.current?.connected) {
                socketRef.current.emit('update_presence', { isAtDesk: false, roomName });
              }
              previousDeskState.current = false;
            } else {
              setIsAtDesk(false);
            }
          }
        });
      }
    } else {
      setIsAtDesk(false);
      setIsPhoneFaceDownOnDesk(false);
      if (socketRef.current?.connected && previousDeskState.current !== false) {
        socketRef.current.emit('update_presence', { isAtDesk: false, roomName });
        previousDeskState.current = false;
      }
    }
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
      setIsPhoneFaceDownOnDesk(false);
    };
  }, [isFocused, appActive, focusRequested, roomName, socketRef, setIsAtDesk, previousDeskState]);

  // Web'de sensörü simüle etmek için
  const toggleWebSensor = () => {
    const newState = !isAtDesk;
    setIsAtDesk(newState);
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_presence', { isAtDesk: newState, roomName });
    }
    previousDeskState.current = newState;
  };

  return { isPhoneFaceDownOnDesk, toggleWebSensor };
}
