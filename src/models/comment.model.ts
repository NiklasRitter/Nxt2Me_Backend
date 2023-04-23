import mongoose from "mongoose";
import {UserDocument} from "./user.model";
import {EventDocument} from "./event.model";

export interface CommentInput {
    userId: UserDocument["_id"];
    eventId: EventDocument["_id"];
    author: string;
    commentText: string;
    creationTimestamp: number;
}

export interface CommentDocument extends CommentInput, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
    reports: number;
    reporters: string[];
}

const commentSchema = new mongoose.Schema(
    {
        userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        eventId: {type: mongoose.Schema.Types.ObjectId, ref: "Event"},
        author: {type: String, required: true},
        commentText: {type: String, required: true},
        creationTimestamp: {type: Number, required: true},
        reports: {type: Number, default: 0},
        reporters: [{
            type: String
        }],
    },
    {
        timestamps: true,
    }
);

const CommentModel = mongoose.model<CommentDocument>("Comment", commentSchema);

export default CommentModel;