import {Request, Response} from "express";
import {
    CreateEventInput,
    DeleteEventInput,
    ReadEventsWithTimestampInput,
    ReadEventsWithTimestampsInput,
    UpdateEventInput,
} from "../schema/event.schema";
import {
    createEvent,
    deleteEventTransaction,
    findAndUpdateEvent,
    findEvent,
    findEvents,
    sendPushNotification,
    updateEvents,
} from "../service/event.service";
import {ReportCommentsInput} from "../schema/comment.schema";
import {findAndUpdateUser, findUser, findUsers} from "../service/user.service";
import {createOneTimeCode} from "../service/oneTimeCode.service";
import * as nodemailer from "nodemailer";
import EventModel, {EventDocument} from "../models/event.model";
import config from "config";
import {cleanString} from "../utils/filter";
import log from "../utils/logger";

export async function createEventHandler(
    req: Request<{}, {}, CreateEventInput["body"]>,
    res: Response
) {
    const userId = res.locals.user._id;

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    const user = await findUser({_id: userId}, {});

    if (!user) return res.status(409).send("User not found");

    if (user.lastEventDay == date.getTime()) {
        if (config.get<number>("maximumEventCreationsPerDay") <= user.eventCreationsToday) {
            return res.status(409).send("Maximum event creations per day reached");
        }
        await findAndUpdateUser({_id: userId}, {$inc: {eventCreationsToday: 1}}, {});
    } else {
        await findAndUpdateUser({_id: userId}, {lastEventDay: date.getTime(), eventCreationsToday: 1}, {});
    }

    const body = req.body;

    body.description = cleanString(body.description);
    body.eventName = cleanString(body.eventName);

    const event = await createEvent({...body, user: userId});

    if (event) {

        res.send(event);

        //****************************************************************************
        // Push Notifications
        //****************************************************************************

        // get the categories of the event
        const eventCategories = event.category;
        for (const category of eventCategories) {
            // search for all the users subscribed to events of this category in a 10km radius
            const subscribedUsers = await findUsers({
                lastKnownLocation: {
                    $near: {
                        $maxDistance: 10000,
                        $geometry: {
                            type: "Point",
                            coordinates: [event.location.coordinates[0], event.location.coordinates[1]]
                        }
                    }
                },
                subscribedCategories: category,
            }, {pushNotificationToken: 1});


            const pushNotificationTokens: string[] = [];
            for (const subscribedUser of subscribedUsers) {
                if (!(subscribedUser._id == userId) && subscribedUser.pushNotificationToken != "") {
                    pushNotificationTokens.push(subscribedUser.pushNotificationToken);
                }
            }

            // send a push notification to all the users
            await sendPushNotification(pushNotificationTokens, event.id, category, event.eventName);
        }
    }
    return;
}

export async function updateEventHandler(
    req: Request<UpdateEventInput["params"]>,
    res: Response
) {
    const userId = res.locals.user._id;
    const eventId = req.params.eventId;
    const update = req.body;

    update.description = cleanString(update.description);
    update.eventName = cleanString(update.eventName);

    const event = await findEvent({_id: eventId});

    if (!event) {
        return res.sendStatus(404);
    }

    if (String(event.user) !== userId) {
        return res.sendStatus(403);
    }

    const updatedEvent = await findAndUpdateEvent({_id: eventId}, update, {
        new: true,
    });

    return res.send(updatedEvent);
}

export async function getFavouriteEventsHandler(
    req: Request,
    res: Response
) {
    const userId = res.locals.user._id;
    const user = await findUser({_id: userId}, {favoriteEventIds: 1});
    const oldEventsTimestamp: number = +req.params.oldEventsTimestamp;
    const newEventsTimestamp: number = +req.params.newEventsTimestamp;
    const date = new Date();
    const now = date.getTime();

    if (!user) {
        return res.sendStatus(404);
    }

    const events = await findEvents({
        _id: {"$in": user.favoriteEventIds},
        $or: [
            {creationTimestamp: {$lt: oldEventsTimestamp}},
            {creationTimestamp: {$gt: newEventsTimestamp}},
        ],
        endTimestamp: {$gt: now}
    }, {lean: true, sort: {"creationTimestamp": -1}, limit: 5});

    if (!events) {
        return res.sendStatus(404);
    }

    return res.send(events);
}

export async function getMyEventsHandler(
    req: Request<ReadEventsWithTimestampsInput["params"]>,
    res: Response
) {
    const userId = res.locals.user._id;
    const oldEventsTimestamp: number = +req.params.oldEventsTimestamp;
    const newEventsTimestamp: number = +req.params.newEventsTimestamp;

    const events = await findEvents({
        user: userId,
        $or: [
            {creationTimestamp: {$lt: oldEventsTimestamp}},
            {creationTimestamp: {$gt: newEventsTimestamp}},
        ],
    }, {lean: true, sort: {"creationTimestamp": -1}, limit: 5});

    if (!events) {
        return res.sendStatus(404);
    }

    return res.send(events);
}

export async function getEventsWithTimestampHandler(
    req: Request<ReadEventsWithTimestampInput["params"]>,
    res: Response
) {
    const userId = res.locals.user._id;
    const longitude = req.params.longitude;
    const latitude = req.params.latitude;
    const radius = req.params.radius;
    const creationTimestamp: number = +req.params.creationTimestamp;

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    const endTimeLimit = date.getTime();

    // update last known location of the user
    await findAndUpdateUser({_id: userId}, {
        "lastKnownLocation.type": "Point",
        "lastKnownLocation.coordinates": [longitude, latitude]
    }, {});

    // return max 10 events around the user (not reported, not maximum viewers reached, already seen, or own event)
    const events: Array<EventDocument> = await findEvents({
        location: {
            $near: {
                $maxDistance: radius,
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                }
            }
        },
        $or: [
            {
                $expr: {
                    $lte: ['$viewerCount', '$maxViews']
                }
            },
            {maxViews: {$eq: -1}},
            {viewer: userId},
            {user: userId},
        ],
        reporters: {$not: {$eq: userId}},
        reports: {$lte: config.get<number>("reportsToQuarantine")},
        creationTimestamp: {$gt: creationTimestamp},
        endTimestamp: {$gt: endTimeLimit},
    }, {lean: true, sort: {"creationTimestamp": 1}, limit: 10});

    if (!events) {
        return res.sendStatus(404);
    }

    const eventIds: Array<string> = [];

    events.forEach(function (event: EventDocument) {
        eventIds.push(event._id);
    })

    // increment viewerCount if user has not seen the event before
    await updateEvents({
        _id: {$in: eventIds},
        $and: [
            {
                $expr: {
                    $lte: ['$viewerCount', '$maxViews']
                }
            },
            {maxViews: {$ne: -1}},
            {viewer: {$not: {$eq: userId}}},
            {user: {$not: {$eq: userId}}}
        ],
        creationTimestamp: {$gt: creationTimestamp},
        endTimestamp: {$gt: endTimeLimit},
    }, {
        $inc: {viewerCount: 1}, $push: {viewer: userId}
    }, {});

    return res.send(events);
}

export async function getEventHandler(req: Request, res: Response) {
    const idEvent = req.params.eventId;
    const userId = res.locals.user._id;

    const event: EventDocument | null = await findEvent({
        _id: idEvent,
        $or: [
            {
                $expr: {
                    $lte: ['$viewerCount', '$maxViews']
                }
            },
            {maxViews: {$eq: -1}},
            {viewer: userId},
            {user: userId},
        ],
    }, {lean: true});

    if (!event) {
        return res.sendStatus(429);
    }

    if (event.maxViews != -1) {
        // update viewerCount
        await findAndUpdateEvent({
            _id: idEvent,
            viewer: {$not: {$eq: userId}},
            user: {$not: {$eq: userId}}
        }, {$inc: {viewerCount: 1}, $push: {viewer: userId}}, {});
    }

    return res.send(event);
}

export async function reportEventHandler(
    req: Request<ReportCommentsInput["params"]>,
    res: Response
) {
    const idEvent = req.params.eventId;
    const userId = res.locals.user._id;

    let event = await findEvent({
        _id: idEvent,
    });

    if (!event) return res.sendStatus(404);

    if (event.reporters.includes(userId)) return res.status(403).send("Event has already been reported");

    // delete id from favoriteEventIds of user
    const user = await findAndUpdateUser({_id: userId}, {$pull: {favoriteEventIds: idEvent}}, {new: false});

    // check if user liked event
    if (user && user.favoriteEventIds.includes(idEvent)) {
        // delete like of reporting user
        event = await findAndUpdateEvent({
            _id: idEvent,
        }, {$inc: {reports: 1, likeCount: -1}, $push: {reporters: userId}}, {new: true});
    } else {
        event = await findAndUpdateEvent({
            _id: idEvent,
        }, {$inc: {reports: 1}, $push: {reporters: userId}}, {new: true});
    }

    if (!event) return res.sendStatus(404);

    // send mail if reports exceed reportsToQuarantine
    if (event.reports >= config.get<number>("reportsToQuarantine")) {

        const user = await findUser({_id: event.user}, {name: 1, email: 1});

        if (!user) {
            //Delete comment if user does not exist
            const statusCode = await deleteEventTransaction(event._id);
            return res.sendStatus(statusCode);
        }

        const code = await createOneTimeCode({
            action: ['delete', 'approve'],
            resourceId: event._id,
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
            subject: 'Event has been reported over 10 times',
            text: 'The event "' + event.eventName + '" from ' + user.name + ' with email "' +
                user.email + '" was reported over 10 times.\n Please follow one of the links underneath to delete or approve the event. \n' +
                `Löschen: ${serverUri}/api/events/reportAction/delete/${code._id}/${event._id} \nWiederherstellen:  ${serverUri}/api/events/reportAction/approve/${code._id}/${event._id}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                log.error(error);
            }
        });
    }

    return res.sendStatus(200);
}

export async function deleteEventHandler(
    req: Request<DeleteEventInput["params"]>,
    res: Response
) {
    const userId = res.locals.user._id;
    const eventId = req.params.eventId;

    const event = await findEvent({_id: eventId});

    if (!event) {
        return res.sendStatus(404);
    }

    if (String(event.user) !== userId) {
        return res.status(403).send("You don´t have the permission to delete this event");
    }

    const statusCode = await deleteEventTransaction(eventId);

    return res.sendStatus(statusCode);
}

export async function deleteLikesOfUser(ids: string[]) {
    return EventModel.updateMany({_id: {$in: ids}}, {$inc: {likeCount: -1}});
}