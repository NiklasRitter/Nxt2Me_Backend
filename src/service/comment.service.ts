import {FilterQuery, QueryOptions, UpdateQuery} from "mongoose";
import CommentModel, {CommentDocument, CommentInput} from "../models/comment.model";

export async function createComment(input: CommentInput) {
    return await CommentModel.create(input);
}

export async function findComments(
    query: FilterQuery<CommentDocument>,
    options: QueryOptions = {lean: true},
    limit: number,
) {
    return await CommentModel.find(query, {}, options).sort({creationTimestamp: -1}).limit(limit);
}

export async function findComment(
    query: FilterQuery<CommentDocument>,
    options: QueryOptions = {lean: true},
) {
    return await CommentModel.findOne(query, {}, options);
}

export async function findAndUpdateComment(
    query: FilterQuery<CommentDocument>,
    update: UpdateQuery<CommentDocument>,
    options: QueryOptions
) {
    return CommentModel.findOneAndUpdate(query, update, options);
}

export async function deleteComment(query: FilterQuery<CommentDocument>) {
    return CommentModel.deleteOne(query);
}

export async function deleteComments(query: FilterQuery<CommentDocument>) {
    return CommentModel.deleteMany(query);
}

