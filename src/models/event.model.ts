import mongoose from "mongoose";
import {UserDocument} from "./user.model";

export interface EventInput {
    user: UserDocument["_id"];
    eventName: string;
    category: string[];
    startTimestamp: number;
    endTimestamp: number;
    organizerName: string;
    description: string;
    locationName: string | null;
    location: pointSchema;
    creationTimestamp: number;
    image: string;
}

export interface EventDocument extends EventInput, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
    likeCount: number;
    reports: number;
    reporters: string[];
    viewer: string[];
    viewerCount: number;
    maxViews: number;
    valid: boolean;
}

interface pointSchema {
    type: string;
    coordinates: number[];
}

const eventSchema = new mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        eventName: {type: String, required: true},
        category: [{
            type: String
        }],
        startTimestamp: {type: Number, required: true},
        endTimestamp: {type: Number, required: true},
        description: {type: String, required: true},
        organizerName: {type: String, required: true},
        locationName: {type: String, default: ""},
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                required: true
            }
        },
        likeCount: {type: Number, default: 0},
        creationTimestamp: {type: Number, required: true},
        image: {type: String, required: true},
        reports: {type: Number, default: 0},
        reporters: [{
            type: String
        }],
        viewer: [{
            type: String
        }],
        viewerCount: {type: Number, default: 0},
        maxViews: {type: Number, default: -1},
        valid: {type: Boolean, default: true},
    },
    {
        timestamps: true,
    }
);

// create index on location to enable GeoJSON Query
eventSchema.index({location: '2dsphere'});

const EventModel = mongoose.model<EventDocument>("Event", eventSchema);

export default EventModel;