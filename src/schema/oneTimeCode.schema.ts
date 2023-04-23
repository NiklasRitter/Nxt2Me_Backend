import {object, string, TypeOf} from "zod";

const forgotPassword = {
    body: object({
        email: string({
            required_error: "email is required",
        }),
    }),
};

const resetPassword = {
    body: object({
        password: string({
            required_error: "password is required",
        }).min(6, "Password too short - should be 6 chars minimum"),
        passwordConfirmation: string({
            required_error: "passwordConfirmation is required",
        }),
    }).refine((data) => data.password === data.passwordConfirmation, {
        message: "Passwords do not match",
        path: ["passwordConfirmation"],
    }),
};

const params = {
    params: object({
        action: string({
            required_error: "action is required",
        }),
        codeId: string({
            required_error: "code is required",
        }),
        resourceId: string({
            required_error: "resourceId is required",
        })
    }),
};

export const oneTimeCodeSchema = object({
    ...params,
});

export const forgotPasswordSchema = object({
    ...forgotPassword,
});

export const oneTimeCodePasswordResetSchema = object({
    ...params,
    ...resetPassword,
});


export type OneTimeCodeInput = TypeOf<typeof oneTimeCodeSchema>;
export type ForgotPasswordInput = TypeOf<typeof forgotPasswordSchema>;
export type ResetPasswordInput = TypeOf<typeof oneTimeCodePasswordResetSchema>;

