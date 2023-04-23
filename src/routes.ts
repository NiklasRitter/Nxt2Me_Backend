import {Express, Request, Response} from "express";
import {createUserSessionHandler, deleteSessionHandler, googleOauthHandler,} from "./controller/session.controller";
import {
    changePasswordUserHandler,
    createUserHandler,
    deleteUserHandler,
    forgotPasswordHandler,
    getUserHandler,
    updatePushNotificationTokenHandler,
    updateSubscribedCategoriesHandler,
} from "./controller/user.controller";
import requireUser from "./middleware/requireUser";
import validateResource from "./middleware/validateResource";
import {createSessionSchema} from "./schema/session.schema";
import {
    addFavoriteSchema,
    createUserSchema,
    googleAuthSchema,
    updatePasswordSchema,
    updatePushNotificationTokenSchema,
    updateSubscribedCategoriesSchema,
    updateUsernameSchema
} from "./schema/user.schema";
import {
    createEventSchema,
    deleteEventSchema,
    getEventSchema,
    getEventsWithTimestampSchema,
    getMyEventsSchema,
    reportEventSchema,
    updateEventSchema
} from "./schema/event.schema";
import {
    createEventHandler,
    deleteEventHandler,
    getEventHandler,
    getEventsWithTimestampHandler,
    getFavouriteEventsHandler,
    getMyEventsHandler,
    reportEventHandler,
    updateEventHandler
} from "./controller/event.controller";
import {
    createCommentSchema,
    getCommentsSchema,
    reportCommentSchema
} from "./schema/comment.schema";
import {
    createCommentHandler,
    getCommentsHandler,
    reportCommentHandler
} from "./controller/comment.controller";
import {changeUsernameService, updateFavoriteService} from "./service/transactions.service";
import {forgotPasswordSchema, oneTimeCodePasswordResetSchema, oneTimeCodeSchema} from "./schema/oneTimeCode.schema";
import {
    oneTimeCodeCommentHandler,
    oneTimeCodeEventHandler,
    oneTimeCodeForgotPasswordHandler,
    oneTimeCodeResetPasswordHandler,
} from "./controller/oneTimeCode.controller";
import {upload} from "./utils/googleDrive";
import {uploadImageHandler} from "./controller/image.controller";
import {resetPasswordError, resetPasswordSuccess} from "./utils/html";

function routes(app: Express) {
    //****************************************************************************
    //                              POST
    //****************************************************************************
    app.post("/api/users", validateResource(createUserSchema), createUserHandler);

    app.post("/api/users/oauth/google", validateResource(googleAuthSchema), googleOauthHandler);

    app.post("/api/users/forgotPassword", validateResource(forgotPasswordSchema), forgotPasswordHandler);

    app.post(
        "/api/sessions",
        validateResource(createSessionSchema),
        createUserSessionHandler
    );

    app.post(
        "/api/events",
        [requireUser, validateResource(createEventSchema)],
        createEventHandler
    );

    app.post(
        "/api/events/:eventId/report/",
        [requireUser, validateResource(reportEventSchema)],
        reportEventHandler
    );

    app.post(
        "/api/events/:eventId/comments/",
        [requireUser, validateResource(createCommentSchema)],
        createCommentHandler
    );

    app.post(
        "/api/events/:eventId/comments/:commentId/report",
        [requireUser, validateResource(reportCommentSchema)],
        reportCommentHandler
    );

    app.post('/api/image', [requireUser, upload], uploadImageHandler);

    app.post(
        "/api/users/passwordAction/resetPassword/:action/:codeId/:resourceId",
        validateResource(oneTimeCodePasswordResetSchema),
        oneTimeCodeResetPasswordHandler
    );

    //****************************************************************************
    //                              GET
    //****************************************************************************

    app.get("/healthcheck", (req: Request, res: Response) => res.sendStatus(200));

    app.get("/api/users", requireUser, getUserHandler);

    app.get(
        "/api/events/:eventId",
        [requireUser, validateResource(getEventSchema)],
        getEventHandler
    );

    app.get(
        "/api/events/explore/:longitude/:latitude/:radius/:creationTimestamp",
        [requireUser, validateResource(getEventsWithTimestampSchema)],
        getEventsWithTimestampHandler
    );

    app.get(
        "/api/events/myEvents/:oldEventsTimestamp/:newEventsTimestamp",
        [requireUser, validateResource(getMyEventsSchema)],
        getMyEventsHandler
    );

    app.get(
        "/api/events/favEvents/:oldEventsTimestamp/:newEventsTimestamp",
        [requireUser, validateResource(getMyEventsSchema)],
        getFavouriteEventsHandler
    );

    app.get(
        "/api/events/:eventId/comments/:oldEventsTimestamp/:newEventsTimestamp/:countComments/",
        [requireUser, validateResource(getCommentsSchema)],
        getCommentsHandler
    );

    app.get("/api/users/passwordAction/:action/:codeId/:resourceId", validateResource(oneTimeCodeSchema), oneTimeCodeForgotPasswordHandler);

    app.get("/success", (req: Request, res: Response) => res.send(resetPasswordSuccess));

    app.get("/error", (req: Request, res: Response) => res.send(resetPasswordError));

    app.get(
        "/api/events/reportAction/:action/:codeId/:resourceId",
        validateResource(oneTimeCodeSchema),
        oneTimeCodeEventHandler
    );

    app.get(
        "/api/comments/:action/:codeId/:resourceId",
        validateResource(oneTimeCodeSchema),
        oneTimeCodeCommentHandler
    );

    //****************************************************************************
    //                              PUT
    //****************************************************************************

    app.put("/api/users/changeUsername", [requireUser, validateResource(updateUsernameSchema)], changeUsernameService);

    app.put("/api/users/credentials", [requireUser, validateResource(updatePasswordSchema)], changePasswordUserHandler);

    app.put("/api/users/subscribedCategories", [requireUser, validateResource(updateSubscribedCategoriesSchema)], updateSubscribedCategoriesHandler);

    app.put("/api/users/pushNotificationToken", [requireUser, validateResource(updatePushNotificationTokenSchema)], updatePushNotificationTokenHandler);

    app.put(
        "/api/events/:eventId",
        [requireUser, validateResource(updateEventSchema)],
        updateEventHandler
    );

    app.put("/api/users/events/:eventId", [requireUser, validateResource(addFavoriteSchema)], updateFavoriteService);

    //****************************************************************************
    //                              DELETE
    //****************************************************************************

    app.delete("/api/users", deleteUserHandler);

    app.delete("/api/sessions", requireUser, deleteSessionHandler);

    app.delete(
        "/api/events/:eventId",
        [requireUser, validateResource(deleteEventSchema)],
        deleteEventHandler
    );
}

export default routes;