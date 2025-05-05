// functions/src/index.ts (Using v2 SDK Syntax)

// Import v2 scheduler trigger and logger
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger"; // Use v2 logger
import * as admin from "firebase-admin";

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
    async (event) => { // The event object contains schedule info
        // Use the v2 logger for better integration with Cloud Logging
        logger.info(`Executing cleanupExpiredPosts function. Triggered at: ${event.scheduleTime}`);

        // Calculate the timestamp threshold for deletion
        const now = new Date();
        const expirationThreshold = new Date(now.getTime() - (EXPIRATION_HOURS * 60 * 60 * 1000));
        // Use admin SDK's Timestamp for Firestore comparison
        const thresholdTimestamp = admin.firestore.Timestamp.fromDate(expirationThreshold);

        logger.info(`Finding posts with 'date' field older than ${expirationThreshold.toISOString()}`);

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
                 const dateString = postDate?.toDate ? postDate.toDate().toISOString() : 'Invalid/Missing Date';
                 logger.log(`Scheduling deletion for post: ${doc.id}, Event Date: ${dateString}`);
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

// Add any other functions below, using v2 syntax (e.g., onCall, onDocumentWritten)