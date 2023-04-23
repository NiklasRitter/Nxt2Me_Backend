import {Request, Response} from "express";
import {UpdateFavoritesInput, UpdateUsernameInput} from "../schema/user.schema";
import mongoose from "mongoose";
import UserModel from "../models/user.model";
import EventModel from "../models/event.model";
import assert from "assert";
import CommentModel from "../models/comment.model";

export async function updateFavoriteService(
    req: Request<UpdateFavoritesInput["params"]>,
    res: Response,
) {
    const eventId = req.params.eventId;
    const userId = res.locals.user._id;

    const session = await mongoose.startSession();
    let newCount = 0;

    try {
        await session.startTransaction();

        const user = await UserModel.findOne({_id: userId}).session(session);
        assert.ok(user);

        // check if event was deleted
        const event = await EventModel.findOne({_id: eventId, valid: true}).session(session);
        assert.ok(event);

        newCount = event.likeCount;

        // remove like if it was liked before
        if (user && user.favoriteEventIds.includes(eventId)) {
            await UserModel.updateOne({_id: userId}, {$pull: {favoriteEventIds: eventId}}).session(session);

            await EventModel.updateOne({_id: eventId}, {$inc: {likeCount: -1}}).session(session);

            newCount -= 1;

        // like event
        } else {
            await UserModel.updateOne({_id: userId}, {$push: {favoriteEventIds: eventId}}).session(session);

            await EventModel.updateOne({_id: eventId}, {$inc: {likeCount: 1}}).session(session);

            newCount += 1;
        }

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        return res.sendStatus(409);
    }

    session.endSession();
    return res.status(200).send("" + newCount);
}

export async function changeUsernameService(
    req: Request<UpdateUsernameInput["body"]>,
    res: Response,
) {

    const userId = res.locals.user._id;
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const user = await UserModel.findOne({_id: userId}).session(session);

        assert.ok(user);
        assert.equal(String(user._id), userId);

        const update = req.body;
        const newUsername = update["newUsername"];

        assert.notEqual(String(user.name), newUsername, "Username is equal to the old one");

        // Only numbers or letters allowed
        const regEx = RegExp("^[a-zA-Z0-9]+[\\s]?[a-zA-Z0-9]+$|^[a-zA-Z0-9]+$");
        assert.ok(regEx.test(newUsername), "Username is not allowed");

        // check if username exists
        const existingUserName = await UserModel.findOne({name: newUsername}).session(session);

        assert.ok(!existingUserName, "Username already in use");

        // set new username
        const updatedUser = await UserModel.findOneAndUpdate({_id: userId}, {name: newUsername}, {
            "fields": {"password": 0, "favoriteEventIds": 0},
            new: true
        }).session(session);

        assert.ok(updatedUser, "Change was not possible due to unknown error. Please try again.");

        // update username in comments
        await CommentModel.updateMany({userId: userId}, {author: updatedUser.name}, {}).session(session);

        await session.commitTransaction();
    } catch (error) {
        let message = "";
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            message = error.message;
        } catch (e) {
            message = "Unknown error";
        }
        await session.abortTransaction();

        return res.status(409).send(message);
    }
    session.endSession();

    return res.sendStatus(200);
}