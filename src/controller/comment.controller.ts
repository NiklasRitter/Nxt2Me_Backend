import {Request, Response} from "express";
import {findEvent,} from "../service/event.service";
import {CreateCommentInput, ReadCommentsInput, ReportCommentsInput} from "../schema/comment.schema";
import {
    createComment,
    deleteComment,
    findAndUpdateComment,
    findComment,
    findComments
} from "../service/comment.service";
import * as nodemailer from 'nodemailer';
import {findAndUpdateUser, findUser} from "../service/user.service";
import {createOneTimeCode} from "../service/oneTimeCode.service";
import config from "config";
import {cleanString} from "../utils/filter";
import log from "../utils/logger";

export async function createCommentHandler(
    req: Request<{}, {}, CreateCommentInput["body"]>,
    res: Response
) {
    const userId = res.locals.user._id;

    const body = req.body;

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    const user = await findUser({_id: userId}, {});

    if (!user) return res.status(409).send("User not found");

    if (user.lastCommentDay == date.getTime()) {
        // check if user reached maximum daily comments
        if (config.get<number>("maximumCommentCreationsPerDay") <= user.commentCreationsToday) {
            return res.status(409).send("Maximum comments per day reached");
        }
        await findAndUpdateUser({_id: userId}, {$inc: {commentCreationsToday: 1}}, {});
    } else {
        await findAndUpdateUser({_id: userId}, {lastCommentDay: date.getTime(), commentCreationsToday: 1}, {});
    }

    const event = await findEvent({_id: body.eventId});

    if (!event) {
        res.status(404).send("Event does not exist");
    }

    body.commentText = cleanString(body.commentText);

    const comment = await createComment({...body, userId: userId});

    return res.send(comment);
}

export async function getCommentsHandler(
    req: Request<ReadCommentsInput["params"]>,
    res: Response
) {
    const userId = res.locals.user._id;
    const idEvent = req.params.eventId;
    const oldEventsTimestamp: number = +req.params.oldEventsTimestamp;
    const newEventsTimestamp: number = +req.params.newEventsTimestamp;
    const limit: number = +req.params.countComments;

    // Query comments with timestamp not in between oldEventsTimestamp and newEventsTimestamp
    const event = await findComments({
        eventId: idEvent,
        $or: [
            {creationTimestamp: {$lt: oldEventsTimestamp}},
            {creationTimestamp: {$gt: newEventsTimestamp}},
        ],
        reports: {$lte: config.get<number>("reportsToQuarantine")},
        reporters: {$not: {$eq: userId}},
    }, {lean: true}, limit);


    if (!event) {
        return res.sendStatus(404);
    }

    return res.send(event);
}


export async function reportCommentHandler(
    req: Request<ReportCommentsInput["params"]>,
    res: Response
) {

    const idEvent = req.params.eventId;
    const idComment = req.params.commentId;
    const userId = res.locals.user._id;

    let comment = await findComment({
        eventId: idEvent,
        _id: idComment,
    });

    if (!comment) return res.sendStatus(404);

    if (comment.reporters.includes(userId)) return res.status(403).send("Comment has already been reported");

    comment = await findAndUpdateComment({
        eventId: idEvent,
        _id: idComment,
    }, {$inc: {reports: 1}, $push: {reporters: userId}}, {new: true});


    if (!comment) return res.sendStatus(404);

    // send email if number of reports exceeds reportsToQuarantine
    if (comment.reports >= config.get<number>("reportsToQuarantine")) {

        const user = await findUser({_id: comment.userId}, {name: 1, email: 1});

        if (!user) {
            //Delete comment if user does not exist
            await deleteComment({_id: comment._id});
            return res.sendStatus(200);
        }

        const code = await createOneTimeCode({
            action: ['delete', 'approve'],
            resourceId: comment._id,
            createdAt: Date.now()
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.get<string>("email"),
                pass: config.get<string>("emailPassword")
            }
        });
        const serverUri = config.get<string>("serverUrl");
        const mailOptions = {
            from: config.get<string>("email"),
            to: config.get<string>("email"),
            subject: 'Comment has been reported over 10 times',
            text: 'The comment "' + comment.commentText + '" from ' + user.name + ' with email "' +
                user.email + '" was reported over 10 times.\n Please follow one of the links underneath to delete or approve the comment. \n' +
                `Löschen:  ${serverUri}/api/comments/delete/${code._id}/${comment._id} \nWiederherstellen:  ${serverUri}/api/comments/approve/${code._id}/${comment._id}`

        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                log.error(error);
            }
        });
    }

    return res.sendStatus(200);
}