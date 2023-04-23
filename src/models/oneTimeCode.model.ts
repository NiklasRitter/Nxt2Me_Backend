import mongoose from "mongoose";

export interface OneTimeCodeInput {
    action: string[];
    resourceId: string;
    createdAt: number;
}

export interface OneTimeCodeDocument extends OneTimeCodeInput, mongoose.Document {
}

const oneTimeCodeSchema = new mongoose.Schema(
    {
        action: [{
            type: String,
            enum: ['delete', 'approve', 'resetPassword', 'forgotPassword'],
        }],
        resourceId: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Number,
            required: true,
        }
    },
);

const OneTimeCode = mongoose.model<OneTimeCodeDocument>("OneTimeCode", oneTimeCodeSchema);

export default OneTimeCode;