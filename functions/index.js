const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Trigger: when a new date notification is created
 * Path: /date_notifications/{channelId}/{notificationId}
 *
 * We:
 *  1. Read the notification data (from, choice, caption)
 *  2. Look up the FCM token saved under /fcmTokens/{channelId}/token
 *  3. Send a push notification to that token
 */
exports.onDateNotificationCreated = functions.database
  .ref("/date_notifications/{channelId}/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const channelId = context.params.channelId;
    const data = snapshot.val();

    if (!data) {
      console.log("No data in notification snapshot");
      return null;
    }

    const from = data.from || "Someone";
    const choice = data.choice || "a plan";
    const caption = data.caption || "";

    // 1️⃣ Get FCM token for this channel
    const tokenSnap = await admin
      .database()
      .ref("fcmTokens/" + channelId + "/token")
      .once("value");

    const token = tokenSnap.val();

    if (!token) {
      console.log("No FCM token found for channel:", channelId);
      return null;
    }

    // 2️⃣ Build notification content
    const title = "💌 Date confirmed!";
    let body = `${from} picked ${choice}`;
    if (caption) {
      body += ` — ${caption}`;
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        channelId: String(channelId),
        from: String(from),
        choice: String(choice),
        caption: String(caption),
      },
    };

    // 3️⃣ Send push notification
    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }

    return null;
  });
