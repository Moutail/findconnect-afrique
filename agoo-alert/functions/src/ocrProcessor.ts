import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

interface OCRData {
  idNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
}

function extractTogoIdData(text: string): OCRData {
  // Pattern pour numéro d'identité togolais (adapter selon le format réel)
  const idNumberPattern = /(?:TG|N°?\s*)[:\s]*([A-Z0-9]{8,15})/i;
  // Pattern pour date (DD/MM/YYYY ou DD-MM-YYYY)
  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;

  const idNumberMatch = text.match(idNumberPattern);
  const dateMatch = text.match(datePattern);

  // L'extraction du nom complet est complexe, on laisse null pour review manuelle
  // ou on peut chercher des patterns comme "Nom:" ou "Name:"
  const namePattern = /(?:Nom|Name)[:\s]+([A-Z\s]+)/i;
  const nameMatch = text.match(namePattern);

  return {
    idNumber: idNumberMatch ? idNumberMatch[1].trim() : null,
    fullName: nameMatch ? nameMatch[1].trim() : null,
    dateOfBirth: dateMatch ? dateMatch[0] : null,
  };
}

export const processIdCardOCR = onCall(async (request) => {
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
    logger.info(`Processing OCR for user ${userId}, image: ${imageUrl}`);

    // Détecter le texte dans l'image
    const [result] = await client.textDetection(imageUrl);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      logger.warn(`No text detected on ID card for user ${userId}`);
      return {
        success: false,
        error: "Aucun texte détecté sur la carte d'identité",
        confidence: 0,
      };
    }

    // Le premier élément contient tout le texte détecté
    const fullText = detections[0].description || "";
    logger.info(`OCR extracted text length: ${fullText.length}`);

    // Extraire les données structurées
    const extracted = extractTogoIdData(fullText);

    // Calculer un score de confiance basique
    const confidence = result.textAnnotations?.[0]?.confidence || 0.8;

    // Stocker les résultats OCR dans le document utilisateur
    const db = admin.firestore();
    await db.collection("users").doc(userId).update({
      ocrData: {
        idNumber: extracted.idNumber,
        fullName: extracted.fullName,
        dateOfBirth: extracted.dateOfBirth,
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),
        confidence: confidence,
        rawText: fullText,
      },
    });

    logger.info(`OCR results stored for user ${userId}`);

    return {
      success: true,
      data: extracted,
      confidence: confidence,
      hasIdNumber: extracted.idNumber !== null,
      hasDateOfBirth: extracted.dateOfBirth !== null,
    };
  } catch (error: any) {
    logger.error("OCR processing error:", error);
    throw new HttpsError(
      "internal",
      "OCR processing failed: " + (error.message || "Unknown error")
    );
  }
});
