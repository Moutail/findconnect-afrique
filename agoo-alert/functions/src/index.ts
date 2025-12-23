/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {defineSecret} from "firebase-functions/params";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

admin.initializeApp();

const BOOTSTRAP_SECRET = defineSecret("BOOTSTRAP_SECRET");

const getProvidedSecret = (req: any): string => {
  const q = String(req.query?.secret ?? "");
  if (q) return q;

  const header = String(req.get?.("x-bootstrap-secret") ?? "");
  if (header) return header;

  const authHeader = String(req.get?.("authorization") ?? "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
};

export const bootstrapSetModerator = onRequest(
  {secrets: [BOOTSTRAP_SECRET]},
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const secret = getProvidedSecret(req);
      const uid = String(req.query.uid ?? "");
      const bootstrapSecret = BOOTSTRAP_SECRET.value();

      if (!bootstrapSecret || secret !== bootstrapSecret) {
        res.status(401).send("Unauthorized");
        return;
      }
      if (!uid) {
        res.status(400).send("Missing uid");
        return;
      }

      await admin.auth().setCustomUserClaims(uid, {
        moderator: true,
      });
      res.status(200).json({ok: true, uid});
    } catch (e) {
      logger.error("bootstrapSetModerator failed", e as Error);
      res.status(500).send("Internal Server Error");
    }
  }
);

export const makeAllReportsPending = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const token = request.auth.token as {
    moderator?: boolean;
  };
  if (!token.moderator) {
    throw new HttpsError("permission-denied", "Moderator role required");
  }

  const db = admin.firestore();
  const snap = await db.collection("reports").get();

  let updated = 0;
  let batch = db.batch();
  let opCount = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      moderationStatus: "pending",
      moderatedAt: null,
      moderatedBy: null,
      rejectionReason: null,
    });
    updated += 1;
    opCount += 1;

    if (opCount === 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return {ok: true, updated};
});

export const makeAllReportsPendingHttp = onRequest(
  {secrets: [BOOTSTRAP_SECRET]},
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const secret = getProvidedSecret(req);
      const bootstrapSecret = BOOTSTRAP_SECRET.value();
      if (!bootstrapSecret || secret !== bootstrapSecret) {
        res.status(401).send("Unauthorized");
        return;
      }

      const db = admin.firestore();
      const snap = await db.collection("reports").get();

      let updated = 0;
      let batch = db.batch();
      let opCount = 0;

      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          moderationStatus: "pending",
          moderatedAt: null,
          moderatedBy: null,
          rejectionReason: null,
        });
        updated += 1;
        opCount += 1;

        if (opCount === 450) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      res.status(200).json({ok: true, updated});
    } catch (e) {
      logger.error("makeAllReportsPendingHttp failed", e as Error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
