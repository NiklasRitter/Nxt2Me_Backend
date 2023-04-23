import mongoose, {FilterQuery, QueryOptions, UpdateQuery} from "mongoose";
import EventModel, {EventDocument, EventInput,} from "../models/event.model";
import axios from "axios";
import UserModel from "../models/user.model";
import CommentModel from "../models/comment.model";
import log from "../utils/logger";


export async function createEvent(input: EventInput) {
    return await EventModel.create(input);
}

export async function sendPushNotification(userTokens: string[], eventId: string, category: string, name: string) {
    try {
        await axios.post('https://fcm.googleapis.com/fcm/send',
            {
                'priority': 'high',
                "notification": {
                    "title": name,
                    "body": 'New ' + category + ' event - check it out now',
                },
                'data': {
                    'click_action': 'FLUTTER_NOTIFICATION_CLICK',
                    'id': 'eventappks',
                    'status': 'done',
                    'event': eventId,
                    'body': 'New ' + category + ' event - check it out now',
                    'title': name
                },
                'registration_ids': userTokens,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'key=AAAAGDaj6PQ:APA91bHI9S7j9yR5zsJUIo1gmwST52GFXadHQsNM-4ZWXY9h5PhI1LZGl_6kl4uBUo2sXQ88usfxX81Psf8iq29SNYOOnYSzYYCqWvowj657iltpWhjcBpCZipJ6nBXilUr261CIdUfq',
                },
            },
        );
    } catch (e) {
        log.error(e);
    }
}

export async function findEvent(
    query: FilterQuery<EventDocument>,
    options: QueryOptions = {lean: true}
) {
    return await EventModel.findOne(query, {}, options);
}

export async function findEvents(
    query: FilterQuery<EventDocument>,
    options: QueryOptions = {lean: true}
) {
    return await EventModel.find(query, {}, options);
}

export async function findAndUpdateEvent(
    query: FilterQuery<EventDocument>,
    update: UpdateQuery<EventDocument>,
    options: QueryOptions
) {
    return EventModel.findOneAndUpdate(query, update, options);
}

export async function deleteEventTransaction(eventId: string): Promise<number> {

    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        // delete eventId from all user favoriteEventIds
        await UserModel.updateMany({favoriteEventIds: eventId}, {$pull: {favoriteEventIds: eventId}});

        // delete comments of event
        await CommentModel.deleteMany({eventId: eventId}).session(session);

        // set event to invalid
        await EventModel.updateOne({_id: eventId}, {valid: false, creationTimestamp: Date.now()}).session(session);

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        return 409;
    }

    await session.endSession();

    return 200;
}

export async function deleteEventsFromUser(userId: string): Promise<number> {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const userEvents = await EventModel.find({user: userId}).session(session);

        // delete all events of a user
        for (let i = 0; i < userEvents.length; i++) {

            const eventId = userEvents[i]._id;

            // delete eventId from all user favoriteEventIds
            await UserModel.updateMany({favoriteEventIds: eventId}, {$pull: {favoriteEventIds: eventId}});

            // delete comments of event
            await CommentModel.deleteMany({eventId: eventId}).session(session);

            // set event to invalid
            await EventModel.updateOne({_id: eventId}, {valid: false, creationTimestamp: Date.now()}).session(session);
        }

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        return 409;
    }
    await session.endSession();

    return 200;
}

export async function updateEvents(query: FilterQuery<EventDocument>,
                                   update: UpdateQuery<EventDocument>,
                                   options: QueryOptions) {
    return EventModel.updateMany(query, update, options);

}