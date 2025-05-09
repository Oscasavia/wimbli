// Chat.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator, // Already imported
  Pressable,
  Alert,
  AlertButton,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  collection,
  // addDoc, // REMOVED - Cloud function handles adding
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  doc,
  getDoc,
  // setDoc, // Keep if used elsewhere
  updateDoc, // Keep updateDoc (used for likes, maybe elsewhere)
  deleteDoc,
  limit,
  getDocs,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions"; // Already imported
import { useTheme } from "../ThemeContext";
import { lightTheme, darkTheme } from "../themeColors";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Message Type Interface (remains the same)
interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  senderName?: string;
  senderAvatar?: string;
  replyToMessageText?: string;
  replyToSenderName?: string;
  likedBy?: string[];
}

// formatTimestamp Function (remains the same)
// ... formatTimestamp code ...
const formatTimestamp = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return "";
    let date: Date;
    try {
        date = timestamp.toDate();
        if (isNaN(date.getTime())) return ""; // Invalid date
    } catch (e) {
        console.error("Error converting timestamp:", e);
        return "";
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
        ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// getInitials Function (remains the same)
// ... getInitials code ...
const getInitials = (name: string | undefined): string => {
    if (!name) return "?";
    return name
        .split(" ")
        .map((n) => n[0])
        .filter((char) => char && char.match(/[a-zA-Z]/))
        .join("")
        .toUpperCase()
        .slice(0, 2);
};


export default function Chat() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId, groupName: initialGroupName } = route.params;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const currentTheme = isDark ? darkTheme : lightTheme;
  const lastTapTimeRef = useRef(0);
  const [groupCreatorId, setGroupCreatorId] = useState<string | null>(null);
  const [isProcessingGroupAction, setIsProcessingGroupAction] = useState(false);
  const [groupTitle, setGroupTitle] = useState(initialGroupName || "Group Chat");
  const [isSendingMessage, setIsSendingMessage] = useState(false); // <-- NEW State for sending indicator

  // --- Theme variable fallbacks (remain the same) ---
  // ... theme variables ...
  const cardBackgroundColor =
    currentTheme.cardBackground || (currentTheme ? "#1c1c1e" : "#ffffff");
  const bubbleSenderBg = currentTheme.primary || "#007AFF";
  const bubbleReceiverBg =
    currentTheme.inputBackground || (theme === "dark" ? "#2c2c2e" : "#f0f0f0");
  const textSenderColor = currentTheme.buttonText || "#ffffff";
  const textReceiverColor = currentTheme.textPrimary || "#000000";
  const timestampSenderColor = textSenderColor + "b0"; // Add opacity
  const timestampReceiverColor = currentTheme.textSecondary || "#8e8e93";
  const inputBackgroundColor =
    currentTheme.inputBackground || (theme === "dark" ? "#2c2c2e" : "#f0f0f0");
  const inputBorderColor =
    currentTheme.inputBorder || (theme === "dark" ? "#444" : "#ddd");
  const placeholderTextColor = currentTheme.textSecondary || "#8e8e93";
  const replyBgColor = theme === "dark" ? "#ffffff15" : "#00000010"; // Subtle reply background
  const replyBorderColor = theme === "dark" ? "#ffffff30" : "#00000020";

  // --- Cloud Function Call Setup (remains the same) ---
  const functions = getFunctions();
  const callDeleteGroupChat = httpsCallable(functions, "deleteGroupChat");
  const callSendMessageWithModeration = httpsCallable(
    functions,
    "sendMessageWithModeration" // Ensure this name matches deployed function
  );

  // --- useEffect for Header/Group Data (remains the same) ---
  useEffect(() => {
    // ... fetchGroupData logic ...
    const fetchGroupData = async () => {
        if (!groupId) {
            console.error("ChatScreen: groupId is missing!");
            Alert.alert("Error", "Cannot load chat, group ID is missing.");
            if (navigation.canGoBack()) navigation.goBack();
            return;
        }
        try {
            const groupRef = doc(db, "groups", groupId);
            const groupSnap = await getDoc(groupRef);
            let title = initialGroupName || "Group Chat";
            let fetchedCreatorId: string | null = null;

            if (groupSnap.exists()) {
                const data = groupSnap.data();
                title = data.title || title;
                setGroupTitle(title);
                fetchedCreatorId = data.createdBy || null; // Get creator ID
                setGroupCreatorId(fetchedCreatorId);
            } else {
                console.warn(
                    `ChatScreen: Group document ${groupId} may have been deleted.`
                );
                Alert.alert("Group Not Found", "This group may have been deleted.");
                if (navigation.canGoBack()) navigation.goBack();
                return;
            }

            navigation.setOptions({
                title: title,
                // headerRight setup remains the same
                 headerRight: () => {
                 const currentUserId = auth.currentUser?.uid;
                 if (fetchedCreatorId && currentUserId) {
                   return (
                     <TouchableOpacity
                       onPress={showGroupOptions}
                       style={{ paddingHorizontal: 6 }} // Adjusted style slightly
                     >
                       <Feather
                         name="more-vertical"
                         size={22}
                         color={currentTheme.textPrimary}
                       />
                     </TouchableOpacity>
                   );
                 }
                 return null;
               },
            });
        } catch (error) {
            console.error("Error fetching group data:", error);
            Alert.alert("Error", "Could not load group details.");
            navigation.setOptions({
                title: initialGroupName || "Group Chat",
                headerRight: () => null,
            });
        }
    };
    fetchGroupData();
  }, [groupId, navigation, initialGroupName, currentTheme.textPrimary]); // Adjusted dependencies

  // --- useEffect to Fetch Messages (remains largely the same, reads data written by CF) ---
  useEffect(() => {
    // ... existing message fetching logic using onSnapshot ...
    // The senderName/senderAvatar fetching fallback might become less necessary
    // if the Cloud Function always denormalizes it correctly.
     if (!groupId) return;
     setLoadingMessages(true);
     const messagesRef = collection(db, "groups", groupId, "messages");
     const q = query(messagesRef, orderBy("timestamp", "asc"));

     const unsubscribe = onSnapshot(
       q,
       async (snapshot) => {
         console.log(
           `Chat snapshot received. Size: ${snapshot.size}, Changes: ${snapshot.docChanges().length}`
         );
         // Now relies on senderName/senderAvatar being written by the Cloud Function
         const msgs = snapshot.docs.map((docSnap): Message => {
           const data = docSnap.data();
           return {
             id: docSnap.id,
             text: data.text || "",
             senderId: data.senderId || "",
             timestamp: data.timestamp || Timestamp.now(),
             replyToMessageText: data.replyToMessageText,
             replyToSenderName: data.replyToSenderName,
             likedBy: data.likedBy || [],
             senderName: data.senderName || "Unknown", // Default if CF somehow missed it
             senderAvatar: data.senderAvatar || null, // Default if CF somehow missed it
           };
         });

         setMessages(msgs);
         setLoadingMessages(false);

         setTimeout(() => {
           flatListRef.current?.scrollToEnd({ animated: true });
         }, 100);
       },
       (error) => {
         console.error("Error fetching messages:", error);
         Alert.alert("Error", "Could not load messages.");
         setLoadingMessages(false);
       }
     );

     // Cleanup function (remains the same)
     return () => {
       console.log(
         "ChatScreen exiting. Unsubscribing messages listener and updating lastSeen."
       );
       unsubscribe();
       AsyncStorage.setItem(`lastSeen_${groupId}`, new Date().toISOString())
         .then(() => console.log(`Updated lastSeen_${groupId} on exit.`))
         .catch((err) => console.error("Error setting lastSeen on exit:", err));
     };
  }, [groupId]);

  // --- Actions (like, group options, leave/delete group, delete message - remain the same) ---
  // ... handleDoubleTapLike ...
  const handleDoubleTapLike = (messageId: string, currentLikes?: string[]) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // ms
    if (now - lastTapTimeRef.current < DOUBLE_PRESS_DELAY) {
        likeMessage(messageId, currentLikes);
    }
    lastTapTimeRef.current = now;
  };
  // ... showGroupOptions ...
    const showGroupOptions = () => {
        const currentUser = auth.currentUser;
        if (!currentUser || groupCreatorId === null) {
            Alert.alert(
                "Error",
                "Cannot perform action. User or group info unavailable."
            );
            return;
        }

        const options: AlertButton[] = [];

        if (currentUser.uid === groupCreatorId) {
            options.push({
                text: "Delete Group",
                onPress: handleDeleteGroup,
                style: "destructive",
            });
        } else {
            options.push({
                text: "Leave Group",
                onPress: handleLeaveGroup,
                style: "destructive",
            });
        }

        options.push({ text: "Cancel", style: "cancel" });

        Alert.alert("Group Options", "Choose an action for this group.", options, {
            cancelable: true,
        });
    };
  // ... handleLeaveGroup ...
    const handleLeaveGroup = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser || !groupId) {
            Alert.alert("Error", "Could not identify user or group.");
            return;
        }
        const userId = currentUser.uid;

        Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Leave",
                style: "destructive",
                onPress: async () => {
                    setIsProcessingGroupAction(true);
                    const groupRef = doc(db, "groups", groupId);
                    try {
                        await updateDoc(groupRef, { members: arrayRemove(userId) });
                        await AsyncStorage.removeItem(`lastSeen_${groupId}`);
                        Alert.alert("Success", "You have left the group.");
                        if (navigation.canGoBack()) navigation.goBack();
                        else navigation.navigate("Messages");
                    } catch (error: any) {
                        console.error("Error leaving group:", error);
                        Alert.alert("Error", `Could not leave the group: ${error.message}`);
                    } finally {
                        setIsProcessingGroupAction(false);
                    }
                },
            },
        ]);
    };
  // ... handleDeleteGroup ...
    const handleDeleteGroup = () => {
        if (!groupId) {
            Alert.alert("Error", "Group ID is missing.");
            return;
        }
        Alert.alert(
            "Delete Group Permanently",
            "This will delete the group and ALL messages for everyone. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Permanently",
                    style: "destructive",
                    onPress: async () => {
                        setIsProcessingGroupAction(true);
                        try {
                            console.log(
                                `Calling deleteGroupChat Cloud Function for group ${groupId}`
                            );
                            const result = await callDeleteGroupChat({ groupId: groupId });
                            console.log("Cloud function result:", result.data);
                            Alert.alert("Success", "Group deletion initiated.");
                            if (navigation.canGoBack()) navigation.goBack();
                            else navigation.navigate("Messages");
                        } catch (error: any) {
                            console.error("Error calling deleteGroupChat function:", error);
                            const message = error.message || "An unknown error occurred.";
                            Alert.alert("Error", `Failed to delete group: ${message}`);
                        } finally {
                            setIsProcessingGroupAction(false);
                        }
                    },
                },
            ]
        );
    };
  // ... likeMessage ...
    const likeMessage = async (
        messageId: string,
        currentLikes: string[] = []
    ) => {
        const userId = auth.currentUser?.uid;
        if (!userId || !groupId) return; // Added groupId check for safety

        const messageRef = doc(db, "groups", groupId, "messages", messageId);
        const isLiked = currentLikes.includes(userId);

        const updatedLikes = isLiked
            ? currentLikes.filter((uid) => uid !== userId) // Unlike
            : [...currentLikes, userId]; // Like

        try {
            await updateDoc(messageRef, { likedBy: updatedLikes });
        } catch (error) {
            console.error("Error updating likes:", error);
            Alert.alert("Error", "Could not update like status.");
        }
    };
  // ... handleDeleteMessage ...
    const handleDeleteMessage = async (messageToDelete: Message) => {
        const currentUserID = auth.currentUser?.uid;
        if (!currentUserID || !groupId) return;

        if (messageToDelete.senderId !== currentUserID) {
             Alert.alert("Access Denied", "You can only delete your own messages.");
             return;
        }

        const messageRef = doc(
            db,
            "groups",
            groupId,
            "messages",
            messageToDelete.id
        );

        Alert.alert(
            "Delete Message",
            "Are you sure you want to permanently delete this message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                             await deleteDoc(messageRef);
                             console.log("Message deleted successfully:", messageToDelete.id);

                             // Update group's last message if this was the last one
                             const groupDocRef = doc(db, "groups", groupId);
                             const groupDocSnap = await getDoc(groupDocRef);

                             if (groupDocSnap.exists()) {
                                 const groupData = groupDocSnap.data();
                                 if (groupData.lastMessageId === messageToDelete.id) {
                                     const messagesQuery = query(
                                         collection(db, "groups", groupId, "messages"),
                                         orderBy("timestamp", "desc"),
                                         limit(1)
                                     );
                                     const newLastMessagesSnap = await getDocs(messagesQuery);
                                     let updateData:any = {};
                                     if (!newLastMessagesSnap.empty) {
                                         const newLastMessageDoc = newLastMessagesSnap.docs[0];
                                         const newLastMessageData = newLastMessageDoc.data();
                                         updateData = {
                                             lastMessage: newLastMessageData.text,
                                             lastUpdated: newLastMessageData.timestamp,
                                             lastMessageId: newLastMessageDoc.id,
                                             lastMessageSenderId: newLastMessageData.senderId, // Added sender ID update
                                         };
                                     } else {
                                         updateData = {
                                             lastMessage: "No messages yet.",
                                             lastUpdated: Timestamp.now(),
                                             lastMessageId: null,
                                             lastMessageSenderId: null, // Clear sender ID
                                         };
                                     }
                                     await updateDoc(groupDocRef, updateData);
                                 }
                             }
                         } catch (error) {
                             console.error("Error deleting message or updating group:", error);
                             Alert.alert("Error", "Could not delete the message.");
                         }
                    },
                    style: "destructive",
                },
            ],
            { cancelable: true }
        );
    };

  // --- MODIFIED: sendMessage Function ---
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSendingMessage) return; // Prevent sending empty or during send

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid || !groupId) { // Added groupId check
      Alert.alert("Error", "You must be logged in and in a valid group to send messages.");
      return;
    }

    // Prepare payload for the Cloud Function
    const messagePayload: any = {
      groupId: groupId,
      text: trimmedInput,
      // Include reply info if applicable
      ...(replyingTo && {
        replyToMessageText: replyingTo.text,
        replyToSenderName: replyingTo.senderName || "Unknown", // Ensure senderName is passed
      }),
    };

    // Optimistic UI updates
    const originalInput = input;
    const originalReplyingTo = replyingTo;
    setInput("");
    setReplyingTo(null);
    setIsSendingMessage(true); // Start loading indicator

    try {
      console.log("[Chat.tsx] Calling sendMessageWithModeration with payload:", messagePayload);
      // Call the Cloud Function
      const result = await callSendMessageWithModeration(messagePayload);
      console.log("[Chat.tsx] Cloud function result:", result.data);

      // Success! The onSnapshot listener will automatically display the new message.
      // Optional: Scroll down explicitly if onSnapshot doesn't trigger scroll reliably
      // setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);

    } catch (error: any) {
      console.error("[Chat.tsx] Error calling sendMessageWithModeration:", error);
      // Handle specific errors returned from the function (e.g., profanity block)
      const errorMessage = error.message || "An unknown error occurred. Could not send message.";
      Alert.alert(
        "Message Not Sent",
        errorMessage // Display the error message from the CF
      );
      // Rollback optimistic updates on error
      setInput(originalInput);
      setReplyingTo(originalReplyingTo);
    } finally {
      setIsSendingMessage(false); // Stop loading indicator regardless of outcome
    }
  };


  // --- Render Message Item (remains the same) ---
  const renderMessageItem = ({ item }: { item: Message }) => {
    // ... existing renderMessageItem logic ...
    // (This function doesn't need changes as it just displays message data)
    const isSender = item.senderId === auth.currentUser?.uid;

    const handleLongPress = () => {
     const options: AlertButton[] = [
       {
         text: "Reply",
         onPress: () => setReplyingTo(item),
       },
     ];

     if (isSender) {
       options.push({
         text: "Delete Message",
         onPress: () => handleDeleteMessage(item),
         style: "destructive",
       });
     }

     options.push({
       text: "Cancel",
       style: "cancel",
     });

     Alert.alert(
       "Message Options",
       `"${item.text.substring(0, 50)}${item.text.length > 50 ? "..." : ""}"`,
       options,
       { cancelable: true }
     );
    };

    return (
      <Pressable
        onPress={() => handleDoubleTapLike(item.id, item.likedBy)}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={[
          styles.messageRow,
          { justifyContent: isSender ? "flex-end" : "flex-start" },
        ]}
      >
        {!isSender && (
          <Image
            source={
              item.senderAvatar
                ? { uri: item.senderAvatar }
                : require("../assets/default-profile.png")
            }
            style={styles.avatar}
          />
        )}
        <View
          style={[
            styles.messageContentContainer,
            isSender ? styles.senderMessageAlign : styles.receiverMessageAlign,
          ]}
        >
          {!isSender && (
            <Text
              style={[styles.senderName, { color: currentTheme.textSecondary }]}
            >
              {item.senderName || "User"}
            </Text>
          )}
          <View
            style={[
              styles.messageBubbleBase,
              isSender ? styles.senderBubble : styles.receiverBubble,
              { backgroundColor: isSender ? bubbleSenderBg : bubbleReceiverBg },
            ]}
          >
            {item.replyToMessageText && (
              <View
                style={[
                  styles.replyContainer,
                  {
                    borderLeftColor: isSender
                      ? textSenderColor + "50"
                      : replyBorderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.replySender,
                    {
                      color: isSender
                        ? textSenderColor + "b0"
                        : currentTheme.textSecondary,
                    },
                  ]}
                >
                  {item.replyToSenderName || "Unknown"}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    {
                      color: isSender
                        ? textSenderColor + "d0"
                        : textReceiverColor + "d0",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.replyToMessageText}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.messageText,
                { color: isSender ? textSenderColor : textReceiverColor },
              ]}
            >
              {item.text}
            </Text>
            <View style={styles.bubbleFooter}>
              {item.likedBy && item.likedBy.length > 0 && (
                <Text
                  style={[
                    styles.likeText,
                    {
                      color: isSender
                        ? timestampSenderColor
                        : timestampReceiverColor,
                    },
                  ]}
                >
                  ❤️ {item.likedBy.length}
                </Text>
              )}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: isSender
                      ? timestampSenderColor
                      : timestampReceiverColor,
                  },
                ]}
              >
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };


  // --- Main Component Return ---
  return (
    <SafeAreaView
      style={[
        styles.screenContainer,
        { backgroundColor: currentTheme.background },
      ]}
      edges={["bottom"]}
    >
      <StatusBar
        backgroundColor={cardBackgroundColor}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      {/* Header - Now using navigation options set in useEffect */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: cardBackgroundColor,
            borderBottomColor: currentTheme.separator,
          },
        ]}
      >
          {/* Header content using groupTitle etc. */}
           <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
             <Text
               numberOfLines={1}
               style={[
                 styles.screenTitle,
                 {
                   color: currentTheme.textPrimary,
                   flex: 1,
                   textAlign: "left", // Keep title aligned left
                  //  fontSize: 20, // Font size already in style
                 },
               ]}
             >
               {groupTitle}
             </Text>
             {/* Keep the options button */}
              {auth.currentUser?.uid && groupCreatorId && (
               <TouchableOpacity
                 onPress={showGroupOptions}
                 style={{ paddingHorizontal: 6 }} // Tappable area
               >
                 <Feather
                   name="more-vertical"
                   size={22}
                   color={currentTheme.textPrimary}
                 />
               </TouchableOpacity>
             )}
           </View>
      </View>

      {/* Loading overlay for group actions */}
      {isProcessingGroupAction && (
         <View style={styles.actionOverlay}>
           <ActivityIndicator size="large" color={currentTheme.primary || "blue"} />
           <Text style={[ styles.actionOverlayText, { color: currentTheme.background || "#fff" }]}> Processing... </Text>
         </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust offset as needed
      >
        {/* Message List */}
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: currentTheme.textSecondary }}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContentContainer}
            onContentSizeChange={() =>
              // Consider adding a check to only scroll if user is near the bottom
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Reply Preview Area */}
        {replyingTo && (
            <View style={[ styles.replyPreviewContainer, { backgroundColor: inputBackgroundColor, borderTopColor: inputBorderColor, } ]}>
                <View style={styles.replyPreviewTextContainer}>
                    <Text style={[ styles.replyPreviewLabel, { color: currentTheme.primary }, ]}>
                        Replying to {replyingTo.senderName || "Unknown"}
                    </Text>
                    <Text style={[ styles.replyPreviewText, { color: currentTheme.textSecondary }, ]} numberOfLines={1} >
                        {replyingTo.text}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelReplyButton} >
                    <Feather name="x" size={20} color={currentTheme.textSecondary} />
                </TouchableOpacity>
            </View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputAreaContainer,
            { borderTopColor: inputBorderColor },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: inputBorderColor, // Use border color from theme
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              style={[styles.textInput, { color: currentTheme.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={placeholderTextColor}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim() && !isSendingMessage // Dim if empty OR sending
                  ? currentTheme.primary
                  : currentTheme.textSecondary,
              },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || isSendingMessage} // Disable if empty OR sending
          >
            {isSendingMessage ? ( // Show activity indicator when sending
              <ActivityIndicator size="small" color={currentTheme.buttonText || "#fff"} />
            ) : (
              <Feather
                name="send"
                size={20}
                color={currentTheme.buttonText || "#fff"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles (remain the same) ---
// ... styles definition ...
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection:"row",
    padding: 15,
    // backgroundColor: currentTheme.cardBackground,
    borderBottomWidth: 1,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
    zIndex: 10, // Ensures it stays above the list in case of overlap
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center", // Will be overridden by flex align left later
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  initialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  messageContentContainer: {
    maxWidth: "80%",
  },
  senderMessageAlign: {
  },
  receiverMessageAlign: {
  },
  senderName: {
    fontSize: 12,
    marginBottom: 3,
    marginLeft: 2,
  },
  messageBubbleBase: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    minWidth: 50,
  },
  senderBubble: {
    borderBottomRightRadius: 4,
  },
  receiverBubble: {
    borderBottomLeftRadius: 4,
  },
  replyContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 6,
    opacity: 0.9,
  },
  replySender: {
    fontWeight: "600",
    fontSize: 11,
    marginBottom: 1,
  },
  replyText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
  },
  likeContainer: {
  },
  likeText: {
    fontSize: 11,
    marginRight: 6,
  },
  timestamp: {
    fontSize: 10,
  },
  replyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderTopWidth: StyleSheet.hairlineWidth, // Use hairline width for subtle separator
  },
  replyPreviewTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 1,
  },
  replyPreviewText: {
    fontSize: 13,
  },
  cancelReplyButton: {
    padding: 5,
  },
  inputAreaContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth, // Use hairline width
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth, // Use hairline width for border
    paddingHorizontal: 12,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 10 : 8, // Adjusted padding
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  actionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  actionOverlayText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
  },
});