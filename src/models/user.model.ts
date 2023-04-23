import mongoose from "mongoose";
import bcrypt from "bcrypt";
import config from "config";

export interface UserInput {
    email: string;
    name: string;
    password: string;
    authMethod: string;
}

export interface UserDocument extends UserInput, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
    lastEventDay: number;
    eventCreationsToday: number;
    lastCommentDay: number;
    commentCreationsToday: number;
    favoriteEventIds: [string];
    pushNotificationToken: string;
    subscribedCategories: [string];
    lastKnownLocation: pointSchema;

    comparePassword(candidatePassword: string): Promise<boolean>;
}

interface pointSchema {
    type: string;
    coordinates: number[];
}

const userSchema = new mongoose.Schema(
    {
        email: {type: String, required: true, unique: true},
        name: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        favoriteEventIds: [{
            type: String,
        }],
        authMethod: {type: String, enum: ['google', 'email'], required: true},
        pushNotificationToken: {type: String,},
        subscribedCategories: [{
            type: String,
        }],
        lastEventDay: {type: Number, default: 0},
        eventCreationsToday: {type: Number, default: 0},
        lastCommentDay: {type: Number, default: 0},
        commentCreationsToday: {type: Number, default: 0},
        lastKnownLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                default: [0.0, 0.0],
            }
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    const user1 = this as unknown;
    const user = user1 as UserDocument;

    if (!user.isModified("password")) {
        return next();
    }

    // encrypt password
    const salt = await bcrypt.genSalt(config.get<number>("saltWorkFactor"));

    user.password = bcrypt.hashSync(user.password, salt);

    return next();
});

userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    const user = this as UserDocument;
    // compare hashed passwords
    return bcrypt.compare(candidatePassword, user.password).catch((e) => false);
};

// create index on location to enable GeoJSON Query
userSchema.index({lastKnownLocation: '2dsphere'});

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
