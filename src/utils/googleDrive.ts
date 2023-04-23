import * as stream from "stream";
import {google} from "googleapis";
import multer from "multer";
import log from "./logger";

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const KEYFILEPATH = './config/credentials.json';

const auth = new google.auth.JWT({
        keyFile: KEYFILEPATH,
        scopes: SCOPES
    }
);

export const driveService = google.drive({version: 'v3', auth});

const uploadFile = async (fileObject: Express.Multer.File) => {
    const bufferStream = new stream.PassThrough();

    // safe file in memory
    bufferStream.end(fileObject.buffer);

    // upload file to drive
    const {data} = await driveService.files.create({
        media: {
            mimeType: fileObject.mimetype,
            body: bufferStream,
        },
        requestBody: {
            name: fileObject.originalname,
            parents: ['1bVJzpgQT7jj1tRF16eI52fX6hVvoX7oQ']
        },
        fields: 'id',
    });

    return data;
};

export const getFileLink = async (fileId: string) => {

    try {
        //change file permissions to public.
        await driveService.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        //obtain the webcontent link
        const result = await driveService.files.get({
            fileId: fileId,
            fields: 'webContentLink',
        });

        return result.data.webContentLink;
    } catch (error) {
        log.error(error);
    }
}

export const upload = multer().single("upload");
export default uploadFile;
