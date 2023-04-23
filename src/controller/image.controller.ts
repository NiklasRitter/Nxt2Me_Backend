import {Request, Response} from "express";
import uploadFile, {getFileLink} from "../utils/googleDrive";
import config from "config";
import {findUser} from "../service/user.service";

export async function uploadImageHandler(
    req: Request,
    res: Response
) {

    try {
        const file = req.file
        if (!file) {
            res.status(406).send('File is missing in request');
            return;
        }

        const userId = res.locals.user._id;

        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);

        const user = await findUser({_id: userId}, {});

        if (!user) return res.status(409).send("User not found");

        if (user.lastEventDay == date.getTime()) {
            // check if maximum creations per day is already reached
            if (config.get<number>("maximumEventCreationsPerDay") <= user.eventCreationsToday) return res.status(409).send("Maximum event creations per day reached");
        }

        // upload file to google drive
        const data = await uploadFile(file);

        if (!data || !data.id) return res.status(400).send("Creation of file failed.");

        // get public link to access file
        const link = await getFileLink(data.id);

        if (!link) return res.status(400).send("Unable to share file.");

        res.status(200).send(link);
    } catch (f) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        log.error(f.message);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        res.send(f.message);
    }

}