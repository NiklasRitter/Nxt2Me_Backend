import {get} from "lodash";
import {NextFunction, Request, Response} from "express";
import {verifyJwt} from "../utils/jwt.utils";
import {reIssueAccessToken} from "../service/session.service";

const deserializeUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const accessToken = get(req, "headers.authorization", "").replace(
        /^Bearer\s/,
        ""
    );

    const refreshToken = get(req, "headers.x-refresh");

    if (!accessToken) {
        return next();
    }

    const {decoded, expired} = verifyJwt(accessToken);

    if (decoded) {
        // set user id to current request
        res.locals.user = decoded;
        return next();
    }

    if (expired && refreshToken) {
        const newAccessToken = await reIssueAccessToken({refreshToken});

        if (newAccessToken) {
            res.setHeader("x-access-token", newAccessToken);
        } else {
            return res.sendStatus(511);
        }

        const result = verifyJwt(newAccessToken as string);

        res.locals.user = result.decoded;
        return next();
    }

    return next();
};

export default deserializeUser;
