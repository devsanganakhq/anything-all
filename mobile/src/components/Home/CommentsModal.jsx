import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { X, Send } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { Colors, Radius } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";

export function CommentsModal({ post, onClose, queryClient, filter }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  const { data: commentData, isLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/feed/comment?postId=${post.id}`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  const comments = commentData?.comments ?? [];

  const submitComment = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/feed/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, text: text.trim() }),
      });
      if (res.ok) {
        setText("");
        queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
        queryClient.invalidateQueries({ queryKey: ["feed", filter] });
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (e) {
      console.error("Comment error", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingAnimatedView
        style={{ flex: 1, backgroundColor: Colors.white }}
        behavior="padding"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: Colors.textPrimary,
            }}
          >
            Comments
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X color={Colors.textSecondary} size={20} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Post mini-summary */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.divider,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <UserAvatar
            uri={post.author_avatar}
            name={post.author_name}
            size={32}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              {post.author_name}
            </Text>
            {post.caption && (
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.textSecondary,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {post.caption}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 11, color: Colors.textMuted }}>
            {post.time_ago}
          </Text>
        </View>

        {/* Comments list */}
        <FlatList
          ref={flatRef}
          data={comments}
          keyExtractor={(item) => `comment-${item.id}`}
          contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                color={Colors.green}
                style={{ marginTop: 36 }}
              />
            ) : (
              <Text
                style={{
                  textAlign: "center",
                  color: Colors.textMuted,
                  marginTop: 36,
                  fontSize: 13,
                }}
              >
                No comments yet. Be the first!
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              <UserAvatar
                uri={item.author_avatar}
                name={item.author_name}
                size={36}
              />
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: Colors.textPrimary,
                    }}
                  >
                    {item.author_name}
                  </Text>
                  <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                    {item.time_ago}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: Colors.ivoryDeep,
                    borderRadius: Radius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: Colors.textPrimary,
                      lineHeight: 20,
                    }}
                  >
                    {item.comment_text}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            backgroundColor: Colors.white,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: Colors.ivoryDeep,
              borderRadius: Radius.xl,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              color: Colors.textPrimary,
              maxHeight: 90,
            }}
            placeholder="Add a comment…"
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            onSubmitEditing={submitComment}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={submitComment}
            disabled={!text.trim() || sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: text.trim() ? Colors.green : Colors.border,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.ivory} />
            ) : (
              <Send size={16} color={Colors.ivory} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingAnimatedView>
    </Modal>
  );
}
