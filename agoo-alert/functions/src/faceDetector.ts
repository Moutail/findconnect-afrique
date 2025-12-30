import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

export const detectFaceInSelfie = onCall(async (request) => {
  // Vérifier que l'utilisateur est authentifié
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {imageUrl, userId} = request.data;

  // Vérifier que l'utilisateur demande sa propre vérification
  if (request.auth.uid !== userId) {
    throw new HttpsError(
      "permission-denied",
      "Cannot process verification for other users"
    );
  }

  if (!imageUrl || !userId) {
    throw new HttpsError("invalid-argument", "Missing imageUrl or userId");
  }

  try {
    logger.info(`Processing face detection for user ${userId}, image: ${imageUrl}`);

    // Détecter les visages dans l'image
    const [result] = await client.faceDetection(imageUrl);
    const faces = result.faceAnnotations;

    const hasFace = faces && faces.length >= 1;
    const faceCount = faces ? faces.length : 0;
    const confidence = faces && faces.length > 0 ?
      (faces[0].detectionConfidence || 0) :
      0;

    logger.info(
      `Face detection for user ${userId}: ` +
      `${faceCount} face(s) detected, confidence: ${confidence}`
    );

    // Stocker les résultats de détection de visage
    const db = admin.firestore();
    await db.collection("users").doc(userId).update({
      faceDetection: {
        hasFace,
        faceCount,
        confidence,
        detectedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    logger.info(`Face detection results stored for user ${userId}`);

    // Vérifier si c'est valide : exactement 1 visage avec bonne confiance
    const isValid = faceCount === 1 && confidence > 0.7;

    return {
      success: true,
      hasFace,
      faceCount,
      confidence,
      isValid,
      message: isValid ?
        "Visage détecté avec succès" :
        faceCount === 0 ?
          "Aucun visage détecté" :
          faceCount > 1 ?
            "Plusieurs visages détectés" :
            "Confiance trop faible",
    };
  } catch (error: any) {
    logger.error("Face detection error:", error);
    throw new HttpsError(
      "internal",
      "Face detection failed: " + (error.message || "Unknown error")
    );
  }
});
