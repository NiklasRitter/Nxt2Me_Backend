import {array, object, string, TypeOf} from "zod";

export const createUserSchema = object({
    body: object({
        name: string({
            required_error: "Name is required",
        }),
        password: string({
            required_error: "password is required",
        }).min(6, "Password too short - should be 6 chars minimum"),
        passwordConfirmation: string({
            required_error: "passwordConfirmation is required",
        }),
        email: string({
            required_error: "Email is required",
        }).email("Not a valid email"),
        authMethod: string({
            required_error: "AuthMethod is required",
        }),
    }).refine((data) => data.password === data.passwordConfirmation, {
        message: "Passwords do not match",
        path: ["passwordConfirmation"],
    }),
});

export const updatePasswordSchema = object({
    body: object({
        oldPassword: string({
            required_error: "password is required",
        }),
        newPassword: string({
            required_error: "password is required",
        }).min(6, "Password too short - should be 6 chars minimum"),
        passwordConfirmation: string({
            required_error: "passwordConfirmation is required",
        }),
    }).refine((data) => data.newPassword === data.passwordConfirmation, {
        message: "Passwords do not match",
        path: ["passwordConfirmation"],
    }),
})

export const updateUsernameSchema = object({
    body: object({
        newUsername: string({
            required_error: "new username is required",
        }),
    }),
});

export const updateSubscribedCategoriesSchema = object({
    body: object({
        subscribedCategories: array(string({
            required_error: "subscribedCategories is required",
        })),
    })
})

export const updatePushNotificationTokenSchema = object({
    body: object({
        pushNotificationToken: string({
            required_error: "pushNotificationToken is required",
        }),
    })
})

const params = {
    params: object({
        eventId: string({
            required_error: "eventId is required",
        }),
    }),
};

const googleAuthParams = {
    body: object({
        serverAuthCode: string({
            required_error: "serverAuthCode is required",
        }),
    }),
};

export const googleAuthSchema = object({
    ...googleAuthParams,
});

export const addFavoriteSchema = object({
    ...params,
});

export type CreateUserInput = Omit<TypeOf<typeof createUserSchema>,
    "body.passwordConfirmation">;

export type UpdateSubscribedCategoriesInput = TypeOf<typeof updateSubscribedCategoriesSchema>;

export type UpdatePushNotificationTokenInput = TypeOf<typeof updatePushNotificationTokenSchema>;

export type UpdatePasswordInput = Omit<TypeOf<typeof updatePasswordSchema>,
    "body.passwordConfirmation">;

export type UpdateUsernameInput = TypeOf<typeof updateUsernameSchema>;

export type UpdateFavoritesInput = TypeOf<typeof addFavoriteSchema>;

export type GoogleAuthInput = TypeOf<typeof googleAuthSchema>;

