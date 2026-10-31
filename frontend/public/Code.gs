/**
 * CNIVE 2026 - Outil de Collecte Mobile
 * Fichier : Code.gs (à coller dans votre éditeur Google Apps Script associé au Google Sheet)
 */

function doGet() {
  // Charge le modèle HTML nommé 'Index' (votre fichier collecte.html renommé en Index)
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('CNIVE 2026 - Portail de Saisie FEV Mobile')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Enregistre les données d'un élève saisi via l'interface mobile dans le Google Sheet actif.
 * Gère également le stockage de la photo compressée dans Google Drive.
 */
function savePupilData(payload) {
  try {
    // 1. Accès au classeur et à la feuille active
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Utilise la première feuille si aucune feuille "Élèves" n'est trouvée
    var sheet = ss.getSheetByName("Élèves") || ss.getSheets()[0];
    
    // 2. Génération de l'identifiant CNIVE incrémental
    var lastRow = sheet.getLastRow();
    // Le premier élève commence à la ligne 3 (après les en-têtes)
    var count = Math.max(0, lastRow - 2); 
    var cniveId = "CNIVE-2026-" + String(count + 1).padStart(5, '0');
    
    // 3. Traitement de la photo de l'élève (si présente)
    var photoUrl = "";
    if (payload.photoData && payload.photoName) {
      // Recherche du dossier CNIVE_Photos_Eleves dans Google Drive, création s'il n'existe pas
      var folders = DriveApp.getFoldersByName("CNIVE_Photos_Eleves");
      var folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("CNIVE_Photos_Eleves");
      }
      
      // Décodage du fichier photo base64
      var decodedData = Utilities.base64Decode(payload.photoData);
      var blob = Utilities.newBlob(decodedData, "image/jpeg", payload.photoName);
      var file = folder.createFile(blob);
      
      // Accorder les droits de lecture à toute personne disposant du lien pour l'affichage de la carte
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = file.getUrl();
    }
    
    // 4. Insertion de la nouvelle ligne dans le tableau
    // Colonnes : A (Identifiant CNIVE), B (Nom), C (Prénom), D (Sexe), E (Naissance), F (Niveau), G (Téléphone)
    // Colonnes : H, I, J, K, L, M (Notes FEV de 1 à 20)
    sheet.appendRow([
      cniveId,
      payload.nom,
      payload.prenom,
      payload.sexe,
      payload.naissance,
      payload.niveau,
      payload.telephone,
      payload.v_economique,
      payload.v_scolaire,
      payload.v_sanitaire,
      payload.v_familiale,
      payload.v_protection,
      payload.v_environnementale
    ]);
    
    var newRow = sheet.getLastRow();
    
    // 5. Ajout des formules universelles de calculs automatiques (en anglais, séparateur virgule dans Apps Script)
    // N: Score Global (somme des critères H à M)
    sheet.getRange(newRow, 14).setFormula("=SUM(H" + newRow + ":M" + newRow + ")");
    
    // O: Moyenne FEV (Score Global / 6 arrondi à 1 décimale)
    sheet.getRange(newRow, 15).setFormula("=ROUND(N" + newRow + "/6, 1)");
    
    // P: Classification de la gravité FEV (IF imbriqués en anglais)
    var formulaClassification = "=IF(N" + newRow + "<=45, \"Très faible / faible\", IF(N" + newRow + "<=75, \"Modérée\", IF(N" + newRow + "<=105, \"Élevée\", \"Critique\")))";
    sheet.getRange(newRow, 16).setFormula(formulaClassification);
    
    // Q: Lien de la photo sur Google Drive
    sheet.getRange(newRow, 17).setValue(photoUrl);
    
    // Retourner la réussite et l'ID généré pour affichage par le client
    return { 
      success: true, 
      cniveId: cniveId 
    };
    
  } catch (error) {
    // Gestion des exceptions pour éviter le blocage du bouton client
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}
