// functions/src/index.ts (Using v2 SDK Syntax)

// Import v2 scheduler trigger and logger
import { onCall, HttpsError } from "firebase-functions/v2/https"; // For HTTPS Callable
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger"; // Use v2 logger
import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore"; // For v2 Firestore triggers

// Initialize Firebase Admin SDK (only once)
admin.initializeApp();
const db = admin.firestore();

// Define the schedule and expiration
const SCHEDULE = "every 6 hours"; // Or cron syntax like "0 */6 * * *"
// const TIMEZONE = "America/Chicago"; // Set your timezone (Important!) Find yours: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const EXPIRATION_HOURS = 24;

// Define the scheduled function using onSchedule (v2)
export const cleanupExpiredPosts = onSchedule(
  {
    schedule: SCHEDULE,
    // timeZone: TIMEZONE,
    // You can add other options like memory, timeout here if needed
    // memory: "512MiB",
    // timeoutSeconds: 300, // 5 minutes (max is 540 for scheduled)
  },
  async (event) => {
    // The event object contains schedule info
    // Use the v2 logger for better integration with Cloud Logging
    logger.info(
      `Executing cleanupExpiredPosts function. Triggered at: ${event.scheduleTime}`
    );

    // Calculate the timestamp threshold for deletion
    const now = new Date();
    const expirationThreshold = new Date(
      now.getTime() - EXPIRATION_HOURS * 60 * 60 * 1000
    );
    // Use admin SDK's Timestamp for Firestore comparison
    const thresholdTimestamp =
      admin.firestore.Timestamp.fromDate(expirationThreshold);

    logger.info(
      `Finding posts with 'date' field older than ${expirationThreshold.toISOString()}`
    );

    const postsRef = db.collection("posts");
    // Ensure your 'date' field is indexed for efficient querying if collection is large
    const query = postsRef.where("date", "<", thresholdTimestamp);

    try {
      const snapshot = await query.get();

      if (snapshot.empty) {
        logger.info("No expired posts found to delete.");
        return; // Exit successfully
      }

      logger.info(`Found ${snapshot.size} expired post(s) to delete.`);

      // Use Batched Writes for deleting multiple documents efficiently (max 500 per batch)
      // If you expect >500 deletes, you'll need to loop through batches.
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        // Log date safely, checking if it exists and is a Timestamp
        const postDate = doc.data().date;
        const dateString = postDate?.toDate
          ? postDate.toDate().toISOString()
          : "Invalid/Missing Date";
        logger.log(
          `Scheduling deletion for post: ${doc.id}, Event Date: ${dateString}`
        );
        batch.delete(doc.ref);
      });

      // Commit the batch
      await batch.commit();
      logger.info(`Successfully deleted ${snapshot.size} expired post(s).`);
      return; // Indicate success
    } catch (error) {
      logger.error("Error querying or deleting expired posts:", error);
      // Consider more robust error reporting for production
      return; // Indicate completion, even with errors
    }
  }
);

// --- NEW: HTTPS Callable Function to delete a group ---
export const deleteGroupChat = onCall(async (request) => {
  // request.auth will contain the authentication information of the user calling this function
  if (!request.auth) {
    logger.error("User not authenticated to delete group.");
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const groupId = request.data.groupId; // Data passed from your client { groupId: "the-group-id" }
  const userId = request.auth.uid; // UID of the authenticated user calling the function

  if (!groupId || typeof groupId !== "string") {
    logger.error("Invalid groupId received:", groupId);
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'groupId' argument."
    );
  }

  logger.info(`Attempting to delete group: ${groupId} by user: ${userId}`);

  const groupRef = db.collection("groups").doc(groupId);

  try {
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      logger.warn(`Group ${groupId} not found for deletion.`);
      // It's often better to return success if the goal is for the group to not exist,
      // or throw 'not-found' if you want to explicitly signal it wasn't there.
      // For simplicity, we'll throw 'not-found' to match the error you *thought* you were getting internally.
      throw new HttpsError(
        "not-found",
        `Group with ID ${groupId} was not found.`
      );
    }

    // Optional: Check if the calling user is the creator or has permission
    const groupData = groupDoc.data();
    if (groupData && groupData.createdBy !== userId) {
      logger.error(
        `User ${userId} is not the creator of group ${groupId}. Creator: ${groupData.createdBy}`
      );
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to delete this group."
      );
    }

    // --- CORRECTED MESSAGE DELETION SECTION ---
    const messagesRef = groupRef.collection("messages");
    let messagesDeletedCount = 0;
    const batchSize = 400; // Keep batch size reasonable

    // Helper function to delete a batch of documents from a query
    async function deleteQueryBatch(
      query: FirebaseFirestore.Query,
      resolve: (value: unknown) => void,
      reject: (reason?: any) => void // Add reject for error propagation
    ) {
      try {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
          // When there are no documents left, we are done
          resolve(undefined);
          return;
        }

        // Delete documents in a batch
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        messagesDeletedCount += snapshot.size;
        logger.info(
          `Deleted a batch of ${snapshot.size} messages for group ${groupId}. Total deleted so far: ${messagesDeletedCount}`
        );

        // Recurse on the same query to process next batch.
        process.nextTick(() => {
          deleteQueryBatch(query, resolve, reject); // Pass reject
        });
      } catch (error) {
        logger.error(
          `Error during batch deletion for group ${groupId}:`,
          error
        );
        reject(error); // Propagate the error
      }
    }

    // Start the iterative deletion process for messages
    logger.info(
      `Starting deletion of messages subcollection for group ${groupId}.`
    );
    await new Promise((resolve, reject) => {
      // Define the query to be used for each batch fetch.
      // We pass the messagesRef itself, and the limit is applied inside deleteQueryBatch
      // by re-creating the limited query based on the base messagesRef.
      // A simpler way is to just pass the base messagesRef and always re-limit.
      const limitedQuery = messagesRef.limit(batchSize);
      deleteQueryBatch(limitedQuery, resolve, reject);
    });

    if (messagesDeletedCount > 0) {
      logger.info(
        `Successfully deleted all ${messagesDeletedCount} messages for group ${groupId}.`
      );
    } else {
      logger.info(
        `No messages found in group ${groupId} to delete, or deletion process already handled them.`
      );
    }
    // --- END OF CORRECTED MESSAGE DELETION SECTION ---

    // Now that messages are deleted, delete the group document itself
    await groupRef.delete();
    logger.info(
      `Group document ${groupId} deleted successfully by user ${userId}.`
    );

    return {
      success: true,
      message: `Group ${groupId} and its messages deleted successfully.`,
    };
  } catch (error: any) {
    logger.error(`Error in deleteGroupChat for group ${groupId}:`, error);
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsError as is
    }
    // For other unexpected errors (e.g., from batch deletion)
    throw new HttpsError(
      "internal",
      `An internal error occurred while deleting group ${groupId}. Details: ${error.message}`
    );
  }
});

export const cleanupSavedPosts = functions.firestore
  .document("posts/{postId}")
  .onDelete(async (snap, context) => {
    const deletedPostId = snap.id; // ID of the post that was just deleted
    const db = admin.firestore(); // Use admin SDK

    logger.info(
      `Post ${deletedPostId} deleted. Cleaning up savedPosts arrays.`
    );

    try {
      const usersRef = db.collection("users");
      const query = usersRef.where(
        "savedPosts",
        "array-contains",
        deletedPostId
      );
      const snapshot = await query.get();

      if (snapshot.empty) {
        logger.info(`No users found who saved post ${deletedPostId}.`);
        return null; // Nothing to do
      }

      // Use batch writes for efficiency if many users might have saved the post
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        logger.log(
          `Removing post ${deletedPostId} from savedPosts for user ${doc.id}`
        );
        batch.update(doc.ref, {
          savedPosts: admin.firestore.FieldValue.arrayRemove(deletedPostId),
        });
      });

      await batch.commit();
      logger.info(
        `Successfully cleaned up savedPosts for post ${deletedPostId} for ${snapshot.size} users.`
      );
      return null;
    } catch (error) {
      logger.error(
        `Error cleaning up savedPosts for deleted post ${deletedPostId}:`,
        error
      );
      // Optional: Add more robust error handling/reporting
      return null;
    }
  });

// --- NEW: HTTPS Callable Function to send a message with moderation ---

// For production, it's better to fetch this list from Firestore (e.g., config/profanityList)
// This allows updates without redeploying functions.
const HARDCODED_BAD_WORDS_LIST: string[] = [
  "KKK",
  "kkk",
  "rape",
  "nigger",
  "nigga",
  "negro",
  "n1gger",
  "chink",
  "spic",
  "kike",
  "jap",
  "gook",
  "faggot",
  "fag",
  "tranny",
  "retard",
  "retarded",
  "fuck",
  "whore",
  "slut",
  "queef",
  "twat",
  "wank",
  "wanker",
  "fucking",
  "motherfucker",
  "bitch",
  "dyke",
  "stupid",
  "pussy",
  "cock",
  "dick",
  "fuckface",
  "dumbass",
  "cum",
  "jizz",
  "necrophilia",
  "maga",
  "bomb",
  "bombed",
  "bombing",
  "pedo",
  "pedophile",
  "cp",
  "loli",
  "terrorist",
  "isis",
  "goddamn",
  "shit",
  "shitty",
  "shithead"
]; // Replace with your initial list

/**
 * Censors text by replacing bad words with asterisks.
 * @param {string} text The input text.
 * @param {string[]} badWords An array of words to censor.
 * @return {{ censoredText: string; wasCensored: boolean }}
 */
function censorText(
  text: string,
  badWords: string[]
): { censoredText: string; wasCensored: boolean } {
  let newText = text;
  let censored = false;
  badWords.forEach((word) => {
    // \b ensures whole word matching. 'gi' for global, case-insensitive.
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    if (regex.test(newText)) {
      newText = newText.replace(regex, "*".repeat(word.length));
      censored = true;
    }
  });
  return { censoredText: newText, wasCensored: censored };
}

export const sendMessageWithModeration = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    logger.error("[sendMessageWithModeration] Error: User not authenticated.");
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const senderId = request.auth.uid;

  // 2. Input Validation
  const { groupId, text, replyToMessageText, replyToSenderName } = request.data;

  if (
    !groupId ||
    typeof groupId !== "string" ||
    !text ||
    typeof text !== "string" ||
    text.trim() === ""
  ) {
    logger.error(
      "[sendMessageWithModeration] Invalid arguments received:",
      request.data
    );
    throw new HttpsError(
      "invalid-argument",
      "Required 'groupId' (string) and 'text' (non-empty string) arguments."
    );
  }
  const trimmedText = text.trim();

  logger.info(
    `[sendMessageWithModeration] User: ${senderId}, Group: ${groupId}, Original Text: "${trimmedText}"`
  );

  // 3. Fetch Sender Information (for denormalization in the message object)
  let senderName = "Unknown User";
  let senderAvatar: string | null = null;
  try {
    const userDocRef = db.collection("users").doc(senderId);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      senderName = userData?.username || "Unknown User"; // Ensure 'username' is correct field
      senderAvatar = userData?.profilePicture || null; // Ensure 'profilePicture' is correct field
    } else {
      logger.warn(
        `[sendMessageWithModeration] User document not found for senderId: ${senderId}`
      );
    }
  } catch (error) {
    logger.error(
      `[sendMessageWithModeration] Error fetching user data for senderId ${senderId}:`,
      error
    );
    // Decide if you want to proceed with defaults or throw an error
  }

  // 4. Content Moderation
  // Option A: Use hardcoded list (as defined above)
  let currentBadWords = HARDCODED_BAD_WORDS_LIST;

  // Option B: Fetch bad words list from Firestore (more flexible for production)
  // try {
  //   const badWordsDoc = await db.collection("config").doc("profanityList").get();
  //   if (badWordsDoc.exists) {
  //     currentBadWords = badWordsDoc.data()?.wordsArray || HARDCODED_BAD_WORDS_LIST; // Assuming 'wordsArray' field
  //   }
  // } catch (fetchError) {
  //   logger.error("[sendMessageWithModeration] Error fetching profanity list from Firestore, using defaults:", fetchError);
  // }

  const { censoredText, wasCensored } = censorText(
    trimmedText,
    currentBadWords
  );

  // --- Alternative: Reject message if bad words found (instead of censoring) ---
  // if (wasCensored) {
  //   logger.warn(`[sendMessageWithModeration] Message from ${senderId} to group ${groupId} blocked due to profanity. Original: "${trimmedText}"`);
  //   throw new HttpsError(
  //     "invalid-argument", // This error code can be specifically handled by the client
  //     "Your message contains inappropriate language and was not sent."
  //   );
  // }

  // 5. Prepare Message Data
  const messageData: any = {
    // Define a proper interface for this in a shared types file if possible
    text: censoredText,
    senderId: senderId,
    senderName: senderName,
    senderAvatar: senderAvatar,
    timestamp: admin.firestore.FieldValue.serverTimestamp(), // Reliable server-side timestamp
    likedBy: [], // Initialize likes
    isCensored: wasCensored,
    ...(wasCensored && { originalText: trimmedText }), // Optionally store original text if censored
    ...(replyToMessageText &&
      typeof replyToMessageText === "string" && {
        // Add reply info if present
        replyToMessageText: replyToMessageText,
        replyToSenderName:
          typeof replyToSenderName === "string" ? replyToSenderName : "User",
      }),
  };

  // 6. Firestore Operations: Add message and update group document in a batch
  const groupRef = db.collection("groups").doc(groupId);
  const newMessageRef = groupRef.collection("messages").doc(); // Auto-generate ID for the new message

  const batch = db.batch();
  batch.set(newMessageRef, messageData); // Set the new message
  batch.update(groupRef, {
    // Update the parent group
    lastMessage: censoredText.substring(0, 60), // Store a snippet for display
    lastUpdated: messageData.timestamp, // This will be the server timestamp after commit
    lastMessageId: newMessageRef.id,
    lastMessageSenderId: senderId,
  });

  try {
    await batch.commit();
    logger.info(
      `[sendMessageWithModeration] Message ${newMessageRef.id} from ${senderId} sent to group ${groupId}. Censored: ${wasCensored}`
    );
    return {
      success: true,
      messageId: newMessageRef.id,
      status: "Message sent successfully.",
      text: censoredText, // Send back the (potentially) censored text
      wasCensored: wasCensored,
    };
  } catch (error) {
    logger.error(
      `[sendMessageWithModeration] Error committing message batch for group ${groupId}, user ${senderId}:`,
      error
    );
    throw new HttpsError(
      "internal",
      "An error occurred while sending your message. Please try again."
    );
  }
});

const IMMEDIATE_KEYWORDS: string[] = [
  "now",
  "live",
  "live now",
  "happening now",
  "starting soon",
  "kicking off soon",
  "in 30 mins",
  "in 30 minutes",
  "in an hour",
  "within the hour",
  "tonight",
  "this evening",
  "today only",
  "flash event",
  "pop up",
  "pop-up", // Added "pop up"
  "impromptu",
  "last minute",
  "urgent",
  "right away",
];
const SPONTANEOUS_HOURS_THRESHOLD = 6; // Events within the next 6 hours can be considered spontaneous

export const flagSpontaneousPost = onDocumentWritten(
  "posts/{postId}", // Listen to writes on any document in the 'posts' collection
  async (event) => {
    const postId = event.params.postId;
    logger.info(`[flagSpontaneousPost] Triggered for post ID: ${postId}`);

    // If the document was deleted, or there's no 'after' state, or 'after' doesn't exist, do nothing.
    if (!event.data || !event.data.after || !event.data.after.exists) {
      logger.info(
        `[flagSpontaneousPost] Post ${postId} was deleted or 'after' data is missing. No action.`
      );
      return null;
    }

    const postData = event.data.after.data(); // This can return DocumentData | undefined

    // ---- ADD THIS CHECK ----
    if (!postData) {
      logger.warn(
        `[flagSpontaneousPost] Post data is undefined for existing document ${postId}. This might indicate an empty document or a data conversion issue. No action.`
      );
      return null;
    }
    // ---- END OF ADDED CHECK ----

    // Now TypeScript knows postData is defined.
    const currentIsSpontaneousValue = postData.isSpontaneous === true; // Default to false if not present

    const title = (postData.title || "").toLowerCase(); // Safely access title
    const description = (postData.description || "").toLowerCase(); // Safely access description
    const eventFirestoreTimestamp = postData.date; // Access date

    let calculatedIsSpontaneous = false;

    // 1. Keyword Check in title or description
    const textToAnalyze = `${title} ${description}`; // title and description are now guaranteed to be strings
    for (const keyword of IMMEDIATE_KEYWORDS) {
      // Assuming IMMEDIATE_KEYWORDS is defined above
      if (textToAnalyze.includes(keyword)) {
        calculatedIsSpontaneous = true;
        logger.info(
          `[flagSpontaneousPost] Keyword match for post ${postId}: "${keyword}"`
        );
        break;
      }
    }

    // 2. Date/Time Proximity Check
    if (
      eventFirestoreTimestamp &&
      typeof eventFirestoreTimestamp.toDate === "function"
    ) {
      const eventDate = eventFirestoreTimestamp.toDate();
      const now = new Date();
      const thresholdInMilliseconds =
        SPONTANEOUS_HOURS_THRESHOLD * 60 * 60 * 1000; // Assuming SPONTANEOUS_HOURS_THRESHOLD is defined

      if (
        eventDate.getTime() > now.getTime() &&
        eventDate.getTime() - now.getTime() < thresholdInMilliseconds
      ) {
        calculatedIsSpontaneous = true;
        logger.info(
          `[flagSpontaneousPost] Date proximity match for post ${postId}. Event is within ${SPONTANEOUS_HOURS_THRESHOLD} hours.`
        );
      }
    } else {
      logger.warn(
        `[flagSpontaneousPost] Post ${postId} has missing or invalid 'date' Timestamp field for proximity check.`
      );
    }

    // Only update the document if the 'isSpontaneous' flag has changed
    if (calculatedIsSpontaneous !== currentIsSpontaneousValue) {
      logger.info(
        `[flagSpontaneousPost] Updating 'isSpontaneous' for post ${postId} from ${currentIsSpontaneousValue} to ${calculatedIsSpontaneous}.`
      );
      try {
        await event.data.after.ref.update({
          isSpontaneous: calculatedIsSpontaneous,
          lastAutoFlaggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(
          `[flagSpontaneousPost] Successfully updated 'isSpontaneous' flag for post ${postId}.`
        );
      } catch (error) {
        logger.error(
          `[flagSpontaneousPost] Error updating post ${postId} with 'isSpontaneous' flag:`,
          error
        );
      }
    } else {
      logger.info(
        `[flagSpontaneousPost] 'isSpontaneous' flag for post ${postId} is already ${currentIsSpontaneousValue}. No update needed.`
      );
    }

    return null;
  }
);

// Add any other functions below, using v2 syntax (e.g., onCall, onDocumentWritten)
