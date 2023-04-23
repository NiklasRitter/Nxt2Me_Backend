import {Request, Response} from "express";
import {
    CreateUserInput,
    UpdatePasswordInput,
    UpdatePushNotificationTokenInput,
    UpdateSubscribedCategoriesInput,
} from "../schema/user.schema";
import {createUser, deleteUser, findAndUpdateUser, findUser} from "../service/user.service";
import logger from "../utils/logger";
import log from "../utils/logger";
import bcrypt from "bcrypt";
import config from "config";
import {deleteEventsFromUser} from "../service/event.service";
import {ForgotPasswordInput} from "../schema/oneTimeCode.schema";
import {createOneTimeCode} from "../service/oneTimeCode.service";
import * as nodemailer from "nodemailer";
import {deleteComments} from "../service/comment.service";
import {updateSession} from "../service/session.service";
import {deleteLikesOfUser} from "./event.controller";

export async function createUserHandler(
    req: Request<{}, {}, CreateUserInput["body"]>,
    res: Response
) {
    try {
        const existingUserEmail = await findUser({email: req.body.email}, {});
        const existingUserName = await findUser({name: req.body.name}, {});

        if (existingUserEmail != null) {
            return res.status(409).send("Email already in use");
        } else if (existingUserName != null) {
            return res.status(409).send("Username already in use");
        } else if (req.body.email == req.body.name) {
            return res.status(409).send("Username is not allowed to equal email address");
        } else {
            const user = await createUser(req.body);
            return res.send(user);
        }
    } catch (e: any) {
        logger.error(e);
        return res.status(409).send(e.message);
    }
}

export async function getUserHandler(req: Request, res: Response) {
    const userId = res.locals.user._id;

    const user = await findUser({_id: userId}, {password: 0});

    return res.send(user);
}

export async function deleteUserHandler(req: Request, res: Response) {
    const userId = res.locals.user._id;

    try {
        const user = await findUser({_id: userId}, {});

        if (!user) return res.status(409).send("Unable to find user");

        // delete all likes set by the user
        await deleteLikesOfUser(user.favoriteEventIds);

        await deleteComments({userId: userId});

        await deleteEventsFromUser(userId);

        await deleteUser({_id: userId}, {});

        // delete session
        const sessionId = res.locals.user.session;

        // invalidate refresh token
        await updateSession({_id: sessionId}, {valid: false});

        return res.status(200).send(userId);
    } catch (e: any) {
        logger.error(e);
        return res.status(409).send(e.message);
    }
}

export async function forgotPasswordHandler(req: Request<{}, {}, ForgotPasswordInput["body"]>, res: Response) {

    const emailQuery = req.body.email;

    const user = await findUser({email: emailQuery}, {password: 0});

    if (!user) {
        return res.status(404).send("User not found.");
    }

    if (user.authMethod == "google") {
        return res.status(404).send("Email uses Google Sign In");
    }

    const code = await createOneTimeCode({action: ['forgotPassword'], resourceId: user._id, createdAt: Date.now()});

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'eventapp.ks@gmail.com',
            pass: 'ioaowuwxadtzdovz'
        }
    });

    const mailOptions = {
        from: 'eventapp.ks@gmail.com',
        to: emailQuery,
        subject: 'Forgot Password',
        text: 'To Reset your password please click on the following link: \n' + config.get<string>("serverUrl") + `/api/users/passwordAction/forgotPassword/${code._id}/${user._id}`

    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            log.error(error);
            return res.status(503).send("Internal Error.");
        }
    });

    return res.sendStatus(200);
}

export async function changePasswordUserHandler(req: Request<{}, {}, UpdatePasswordInput["body"]>, res: Response) {
    const userId = res.locals.user._id;

    const user = await findUser({_id: userId}, {});

    const update = req.body;

    if (!user) {
        return res.sendStatus(404);
    }

    if (String(user._id) !== userId) {
        return res.sendStatus(403);
    }
    const oldPassword = update["oldPassword"];

    // encrypt new password
    const salt = await bcrypt.genSalt(config.get<number>("saltWorkFactor"));
    const hash = bcrypt.hashSync(update["newPassword"], salt);

    // check if old password is correct
    const isValid = await bcrypt.compare(oldPassword, user.password).catch((e) => false);

    if (!isValid) {
        return res.sendStatus(403);
    }

    // set new password
    const updatedUser = await findAndUpdateUser({_id: userId}, {password: hash}, {
        "fields": {"password": 0, "favoriteEventIds": 0},
        new: true
    });

    if (updatedUser) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(400);
    }
}

export async function updateSubscribedCategoriesHandler(req: Request<{}, {}, UpdateSubscribedCategoriesInput["body"]>, res: Response) {
    const userId = res.locals.user._id;
    const updateSubscribedCategories = req.body["subscribedCategories"];

    const updatedUser = await findAndUpdateUser({_id: userId}, {subscribedCategories: updateSubscribedCategories}, {new: true});

    if (updatedUser) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(400);
    }
}

export async function updatePushNotificationTokenHandler(req: Request<{}, {}, UpdatePushNotificationTokenInput["body"]>, res: Response) {
    const userId = res.locals.user._id;
    const updatePushNotificationToken = req.body["pushNotificationToken"];

    const updatedUser = await findAndUpdateUser({_id: userId}, {pushNotificationToken: updatePushNotificationToken}, {new: true});

    if (updatedUser) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(400);
    }
}

