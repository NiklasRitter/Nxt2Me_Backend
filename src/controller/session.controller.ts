import {Request, Response} from "express";
import config from "config";
import {createSession, findSessions, updateSession,} from "../service/session.service";
import {
    findAndUpdateUser,
    findUser,
    getGoogleOAuthTokens,
    getGoogleUser,
    validatePassword
} from "../service/user.service";
import {signJwt} from "../utils/jwt.utils";
import log from "../utils/logger";
import {GoogleAuthInput} from "../schema/user.schema";

export async function createUserSessionHandler(req: Request, res: Response) {
    // Validate the user's password
    const user = await validatePassword(req.body);

    if (!user) {
        return res.status(401).send("Invalid email or password");
    }

    // create a session
    const session = await createSession(user._id.toString(), req.get("user-agent") || "");

    // create access token
    const accessToken = signJwt(
        {...user, session: session._id},
        {expiresIn: config.get("accessTokenTtl")} // 15 minutes
    );

    // create a refresh token
    const refreshToken = signJwt(
        {...user, session: session._id},
        {expiresIn: config.get("refreshTokenTtl")} // 1 year
    );

    // return access & refresh tokens
    return res.send({accessToken, refreshToken, user});
}

export async function deleteSessionHandler(req: Request, res: Response) {
    const sessionId = res.locals.user.session;

    await updateSession({_id: sessionId}, {valid: false});

    return res.send({
        accessToken: null,
        refreshToken: null,
    });
}

export async function googleOauthHandler(req: Request<GoogleAuthInput["body"]>, res: Response) {
    // get the code
    const code = req.body.serverAuthCode as string;

    try {
        // get the id and access token with the code
        const {id_token, access_token} = await getGoogleOAuthTokens({code});

        // get user with tokens
        const googleUser = await getGoogleUser({id_token, access_token});

        if (!googleUser) {
            return res.status(403).send("Google user error")
        }

        if (!googleUser.verified_email) {
            return res.status(403).send("Google account is not verified");
        }

        const existingUser = await findUser({email: googleUser.email, authMethod: "email"}, {});

        if (existingUser != null) {
            return res.status(403).send("User already registered with password.");
        }

        let user = await findUser({email: googleUser.email}, {});
        let statuscode = 200;

        if (user == null) {
            // register new user if not existent
            user = await findAndUpdateUser(
                {
                    email: googleUser.email,
                },
                {
                    email: googleUser.email,
                    name: googleUser.email,
                    authMethod: "google",
                },
                {
                    upsert: true,
                    new: true,
                }
            );
            statuscode = 201;
        }

        if (!user) {
            return res.status(403).send("No user found");
        }

        // create a session
        const session = await createSession(user._id, req.get("user-agent") || "");

        // create access token
        const accessToken = signJwt(
            {...user, session: session._id},
            {expiresIn: config.get("accessTokenTtl")} // 15 minutes
        );

        // create refresh token
        const refreshToken = signJwt(
            {...user, session: session._id},
            {expiresIn: config.get("refreshTokenTtl")} // 1 year
        );

        // return access & refresh tokens
        return res.status(statuscode).send({accessToken, refreshToken, user});
    } catch (error) {
        log.error(error, "Failed to authorize Google user");
        return res.status(404).send("Failed to authorize Google user");
    }
}