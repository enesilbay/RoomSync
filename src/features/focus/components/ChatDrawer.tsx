import React, { type RefObject } from 'react';
import {
  Alert, Animated, Dimensions, FlatList, Image, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import { assetUrl } from '@/src/lib/api';
import { C, Theme } from '@/src/theme';
import type { ChatMessage } from '../types';

const { height } = Dimensions.get('window');

const openLink = async (url: string | null) => {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert("Tarayıcı Bulunamadı", `Cihazınızda bağlantıyı açacak bir tarayıcı yok:\n\n${url}`);
  }
};

type Props = {
  chatAnim: Animated.Value;
  chatList: ChatMessage[];
  flatListRef: RefObject<FlatList<ChatMessage> | null>;
  myUserId: number;
  message: string;
  onChangeMessage: (text: string) => void;
  onClose: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onSend: () => void;
};

// CHAT DRAWER
export function ChatDrawer({
  chatAnim,
  chatList,
  flatListRef,
  myUserId,
  message,
  onChangeMessage,
  onClose,
  onPickImage,
  onPickDocument,
  onSend,
}: Props) {
  return (
    <Animated.View style={[s.chatDrawer, { transform: [{ translateY: chatAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }] }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.chatHeader}>
          <Text style={s.chatTitle}>Lobi Sohbeti</Text>
          <TouchableOpacity onPress={onClose} style={s.chatCloseBtn}>
            <FontAwesome5 solid name="times" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef} data={chatList} keyExtractor={(_, i) => i.toString()} style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => {
            const isMe = item.userId === myUserId;
            const isFile = item.type === 'file';
            const isImage = item.type === 'image';
            const bubbleColor = typeof item.equippedBubbleColor === 'string' && item.equippedBubbleColor.trim()
              ? item.equippedBubbleColor
              : undefined;
            const equippedIcon = typeof item.equippedIcon === 'string' ? item.equippedIcon : '';
            return (
              <View style={[
                s.bubble,
                isMe ? s.bubbleMe : s.bubbleOther,
                bubbleColor && { backgroundColor: bubbleColor, borderColor: bubbleColor },
              ]}>
                {!isMe && (
                  <View style={s.bubbleUserRow}>
                    <FramedAvatar
                      uri={assetUrl(item.avatarUrl)}
                      name={item.fullName}
                      frameId={item.equippedProfileFrame}
                      size={24}
                      colors={C}
                      backgroundColor={C.softIndigo}
                      textSize={10}
                      activeBorderWidth={2}
                    />
                    <Text style={s.bubbleUser}>
                      {item.fullName?.split(' ')[0]} {equippedIcon ? <Text style={s.equippedNameIcon}>{equippedIcon}</Text> : null} {item.isPremium && <FontAwesome5 solid name="crown" size={10} color={C.accent} />}
                    </Text>
                  </View>
                )}
                {isImage ? (
                  <TouchableOpacity onPress={() => openLink(assetUrl(item.fileUrl))}>
                    <Image source={{ uri: assetUrl(item.fileUrl) ?? '' }} style={s.imagePreview} />
                  </TouchableOpacity>
                ) : isFile ? (
                  <TouchableOpacity style={s.fileCard} onPress={() => openLink(assetUrl(item.fileUrl))}>
                    <View style={s.fileIconWrap}><FontAwesome5 solid name="file-pdf" size={16} color={C.danger} /></View>
                    <Text style={s.fileName} numberOfLines={1}>{item.text}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[s.messageText, (isMe || bubbleColor) && s.messageTextOnColor]}>{item.text}</Text>
                )}
              </View>
            );
          }}
        />

        <View style={s.chatInputRow}>
          <TouchableOpacity onPress={onPickImage} style={s.attachBtn}><FontAwesome5 solid name="image" size={18} color={C.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={onPickDocument} style={s.attachBtn}><FontAwesome5 solid name="paperclip" size={18} color={C.primary} /></TouchableOpacity>
          <TextInput
            style={s.chatInput} value={message} onChangeText={onChangeMessage}
            placeholder="Mesaj yaz..." placeholderTextColor={C.textMuted}
          />
          <TouchableOpacity onPress={onSend} style={s.sendBtn}>
            <LinearGradient colors={[C.primary, C.secondary]} style={s.sendBtnGrad}>
              <FontAwesome5 solid name="paper-plane" size={14} color={C.onColor} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  chatDrawer: { position: 'absolute', bottom: 100, left: 0, right: 0, height: height * 0.6, backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: C.border, ...Theme.shadows.medium },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderColor: C.border },
  chatTitle: { color: C.textDark, fontSize: 16, fontWeight: '800' },
  chatCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.softIndigo, alignItems: 'center', justifyContent: 'center' },

  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginVertical: 6 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: C.softIndigo, borderBottomRightRadius: 4, borderWidth: 1, borderColor: C.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: C.background, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  messageText: { color: C.textDark, fontSize: 14 },
  messageTextOnColor: { color: C.onColor },
  bubbleUserRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  bubbleUser: { fontSize: 11, color: C.accent, fontWeight: '800' },
  equippedNameIcon: { fontSize: 11 },
  imagePreview: { width: 160, height: 160, borderRadius: 14, marginVertical: 5 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.softDanger, padding: 12, borderRadius: 14 },
  fileIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.softDanger, alignItems: 'center', justifyContent: 'center' },
  fileName: { color: C.textDark, fontSize: 13, flex: 1, fontWeight: '500' },

  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, backgroundColor: C.background, borderTopWidth: 1, borderColor: C.border },
  chatInput: { flex: 1, height: 48, backgroundColor: C.surface, borderRadius: 24, paddingHorizontal: 18, color: C.textDark, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  attachBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: C.softIndigo, borderWidth: 1, borderColor: C.border },
  sendBtn: { borderRadius: 24, overflow: 'hidden', elevation: 4 },
  sendBtnGrad: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
