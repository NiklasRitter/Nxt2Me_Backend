import {array, number, object, string, TypeOf} from "zod";

const payload = {
    body: object({
        eventName: string({
            required_error: "eventName is required",
        }),
        description: string({
            required_error: "description is required",
        }),
        organizerName: string({
            required_error: "organizerName is required",
        }),
        category: array(string()),
        startTimestamp: number({
            required_error: "startTimestamp is required",
        }),
        endTimestamp: number({
            required_error: "endTimestamp is required",
        }),
        locationName: string({
            required_error: "locationName is required",
        }).nullable(),
        location: object({
            type: string({
                required_error: "type is required"
            }),
            coordinates: array(number(), {
                required_error: "coordinates are required"
            })
        }),
        creationTimestamp: number({
            required_error: "creationTimestamp is required",
        }),
        image: string({
            required_error: "image is required",
        }),
        maxViews: number({
            required_error: "maxViews is required",
        })
    }),
};

const params = {
    params: object({
        eventId: string({
            required_error: "eventId is required",
        }),
    }),
};


const locationParamsWithTimestamp = {
    params: object({
        longitude: string({
            required_error: "longitude is required",
        }),
        latitude: string({
            required_error: "latitude is required",
        }),
        radius: string({
            required_error: "radius is required",
        }),
        creationTimestamp: string({
            required_error: "creationTimestamp is required",
        }),
    }),
};

const onlyTimestampParams = {
    params: object({
        oldEventsTimestamp: string({
            required_error: "oldEventsTimestamp is required",
        }),
        newEventsTimestamp: string({
            required_error: "newEventsTimestamp is required",
        }),
    }),
};


export const createEventSchema = object({
    ...payload,
});

export const updateEventSchema = object({
    ...payload,
    ...params,
});

export const deleteEventSchema = object({
    ...params,
});

export const getEventSchema = object({
    ...params,
});

export const getEventsWithTimestampSchema = object({
    ...locationParamsWithTimestamp,
});

export const getMyEventsSchema = object({
    ...onlyTimestampParams,
});

export const reportEventSchema = object({
    ...params,
});


export type CreateEventInput = TypeOf<typeof createEventSchema>;
export type UpdateEventInput = TypeOf<typeof updateEventSchema>;
export type ReadEventsWithTimestampInput = TypeOf<typeof getEventsWithTimestampSchema>;
export type ReadEventsWithTimestampsInput = TypeOf<typeof getMyEventsSchema>;
export type DeleteEventInput = TypeOf<typeof deleteEventSchema>;