import * as functions from 'firebase-functions';
import { FaceClient } from "@azure/cognitiveservices-face";
import { CognitiveServicesCredentials } from "@azure/ms-rest-azure-js";
// import Axios from "axios";
// import { FaceListListOptionalParams, PersonGroupListOptionalParams } from '@azure/cognitiveservices-face/esm/models';

const DEFAULT_PERSON_GROUP = "6939bd76-c104-4831-9a3f-1ec969e32a1b"; // Presidents
// const DEFAULT_PERSON_ID = "177f9642-d489-462c-85fa-f8f25313f523"; // Obama

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

export const addFace = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        return "Bad Request";
    }
    const image = data.image;
    const pid = data.personId;
    const group = data.groupId;

    const client = getClient();
    await client.personGroupPerson.addFaceFromStream(group, pid, image);
    await client.personGroup.train(group);
    return "Done";
});

export const getFaceId = functions.https.onCall(async (data, context) => {
    const image = data.image;
    const group = data.groupId || DEFAULT_PERSON_GROUP;
    const client = getClient();
    const faces = await client.face.detectWithStream(image, {detectionModel: "detection_02"});
    let faceIds: string[] = []
    faces.forEach(face => faceIds.push(face.faceId as string));
    const resp = await client.face.identify(faceIds, {personGroupId: group});
    let results: string[] = []
    resp.forEach(r => results.push(r.candidates[0].personId));
    return results;
});

export const createPerson = functions.https.onCall(async (data, context) => {
    const image = data.image;
    const group = data.groupId;
    const client = getClient();
    const newPerson = await client.personGroupPerson.create(group);
    await client.personGroupPerson.addFaceFromStream(group, newPerson.personId, image);
    return newPerson.personId;
});

const getClient = () => {
    const faceKey = functions.config().face.key as string;
    const faceEndPoint = functions.config().face.url as string;
    const cognitiveServiceCredentials = new CognitiveServicesCredentials(faceKey);
    return new FaceClient(cognitiveServiceCredentials, faceEndPoint);
};