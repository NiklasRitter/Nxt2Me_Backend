import {FilterQuery, QueryOptions} from "mongoose";
import OneTimeCode from "../models/oneTimeCode.model";
import OneTimeCodeModel, {OneTimeCodeDocument, OneTimeCodeInput} from "../models/oneTimeCode.model";

export async function createOneTimeCode(input: OneTimeCodeInput) {
    return  await OneTimeCode.create(input);
}

export async function findOneTimeCode(
    query: FilterQuery<OneTimeCodeDocument>,
    options: QueryOptions = {lean: true}
) {
    return await OneTimeCode.findOne(query, {}, options);
}

export async function deleteOneTimeCode(query: FilterQuery<OneTimeCodeDocument>) {
    return OneTimeCodeModel.deleteOne(query);
}