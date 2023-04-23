import {number, object, string, TypeOf} from "zod";

const payload = {
    body: object({
        eventId: string({
            required_error: "eventId is required",
        }),
        author: string({
            required_error: "author is required",
        }),
        commentText: string({
            required_error: "commentText is required",
        }),
        creationTimestamp: number({
            required_error: "creationTimestamp is required",
        }),
    }),
};

const params = {
    params: object({
        eventId: string({
            required_error: "eventId is required",
        }),
    }),
};

const getCommentsParams = {
    params: object({
        eventId: string({
            required_error: "eventId is required",
        }),
        newEventsTimestamp: string({
            required_error: "newEventsTimestamp is required",
        }),
        oldEventsTimestamp: string({
            required_error: "oldEventsTimestamp is required",
        }),
        countComments: string({
            required_error: "countComments is required",
        }),
    }),
};

const reportParams = {
    params: object({
        eventId: string({
            required_error: "eventId is required",
        }),
        commentId: string({
            required_error: "commentId is required",
        }),
    }),
};

export const createCommentSchema = object({
    ...params,
    ...payload,
});

export const updateCommentSchema = object({
    ...payload,
    ...params,
});


export const getCommentsSchema = object({
    ...getCommentsParams,
});

export const reportCommentSchema = object({
    ...reportParams,
});


export type CreateCommentInput = TypeOf<typeof createCommentSchema>;
export type ReadCommentsInput = TypeOf<typeof getCommentsSchema>;
export type ReportCommentsInput = TypeOf<typeof reportCommentSchema>;
