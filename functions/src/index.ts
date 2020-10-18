import * as functions from 'firebase-functions';
import { FaceClient } from "@azure/cognitiveservices-face";
import { CognitiveServicesCredentials } from "@azure/ms-rest-azure-js";
import admin = require("firebase-admin");
import { HttpsError } from 'firebase-functions/lib/providers/https';
import { v4 as uuidv4 } from 'uuid';
// import Axios from "axios";
// import { FaceListListOptionalParams, PersonGroupListOptionalParams } from '@azure/cognitiveservices-face/esm/models';
admin.initializeApp();
// const DEFAULT_PERSON_GROUP = "6939bd76-c104-4831-9a3f-1ec969e32a1b"; // Presidents
const GROUP_ID = "hackathondefault1"
// const DEFAULT_PERSON_ID = "177f9642-d489-462c-85fa-f8f25313f523"; // Obama
export const addFace = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "Request had invalid credentials.");
    }
    try {
        const img_str: string = data.image;
        const image = Buffer.from(img_str, 'base64');
        let pid = data.personId;
        const client = getClient();
        if (pid) {
            await client.personGroupPerson.addFaceFromStream(GROUP_ID, pid, image);
        } else {
            console.log("creating new person")
            const name = uuidv4();
            const newPerson = await client.personGroupPerson.create(GROUP_ID, {
                name: name
            });
            console.log("created new person")
            await client.personGroupPerson.addFaceFromStream(GROUP_ID, newPerson.personId, image);
            pid =  newPerson.personId;
        }
        return pid;
    } catch (e) {
        console.error(e);
        throw new HttpsError("internal", "Unknown error:", e.toString());
    }
});

export const getPersonId = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "Request had invalid credentials.");
    }
    try {
        const img_str = data.image;
        const image = Buffer.from(img_str, 'base64');
        const client = getClient();
        const faces = await client.face.detectWithStream(image, {detectionModel: "detection_02"});
        let faceIds: string[] = []
        faces.forEach(face => faceIds.push(face.faceId as string));
        const resp = await client.face.identify(faceIds, {personGroupId: GROUP_ID});
        let results: string[] = []
        resp.forEach(r => results.push(r.candidates[0].personId));
        return results;
    } catch (e) {
        console.error(e);
        throw new HttpsError("internal", "Possible Face Error", e.toString());
    }

});

// export const onSignOn = functions.auth.user().onCreate((user, context) => {
//     const db = admin.firestore();
//     db.collection("users").doc(user.uid).update({
//         group: GROUP_ID,
//         personId: 
//     });
// });

// export const testGroup = functions.https.onRequest( async (req, res) => {
//     const client = getClient();
//     let result = "";
//     try {
//         const resp = await client.personGroup.create("hackathondefault1", {
//             recognitionModel: "recognition_03",
//             name: "hackathondefault1"
//         });
//         result = resp.toString();
//     } catch (e) {
//         console.log(e);
//         result = e.toString();
//     }
//     res.send(result);
// });

const getClient = () => {
    const faceKey = functions.config().face.key as string;
    const faceEndPoint = functions.config().face.url as string;
    const cognitiveServiceCredentials = new CognitiveServicesCredentials(faceKey);
    return new FaceClient(cognitiveServiceCredentials, faceEndPoint);
};