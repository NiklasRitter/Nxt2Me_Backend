import {Request, Response} from "express";
import {OneTimeCodeInput, ResetPasswordInput} from "../schema/oneTimeCode.schema";
import {createOneTimeCode, deleteOneTimeCode, findOneTimeCode} from "../service/oneTimeCode.service";
import config from "config";
import {deleteComment, findAndUpdateComment} from "../service/comment.service";
import {deleteEventTransaction, findAndUpdateEvent} from "../service/event.service";
import {findAndUpdateUser, findUser} from "../service/user.service";
import bcrypt from "bcrypt";
import {commentApproved, commentDeleted, eventApproved, eventDeleted} from "../utils/html";


export async function oneTimeCodeCommentHandler(
    req: Request<OneTimeCodeInput["params"]>,
    res: Response
) {
    const action = req.params.action;
    const codeId = req.params.codeId;
    const resourceId = req.params.resourceId

    const code = await findOneTimeCode({_id: codeId});

    if (!code) {
        return res.sendStatus(404);
    }

    if (!code.action.includes(action)) {
        return res.sendStatus(400);
    }

    if (code.resourceId != resourceId) {
        return res.sendStatus(400);
    }

    if (code.createdAt + config.get<number>("oneTimeCodeTtl") < Date.now()) {
        return res.sendStatus(410);
    }

    if (action == 'approve') {
        // reset reports
        const comment = await findAndUpdateComment({_id: resourceId}, {reports: 0, $set: { reporters: [] }}, {});
        if (!comment) {
            return res.sendStatus(404);
        }

        await deleteOneTimeCode({_id: codeId});

        return res.send(commentApproved);

    } else if (action == 'delete') {
        await deleteComment({_id: resourceId});

        await deleteOneTimeCode({_id: codeId});

        return res.send(commentDeleted);

    } else {
        return res.sendStatus(400);
    }
}

export async function oneTimeCodeEventHandler(
    req: Request<OneTimeCodeInput["params"]>,
    res: Response
) {
    const action = req.params.action;
    const codeId = req.params.codeId;
    const resourceId = req.params.resourceId

    const code = await findOneTimeCode({_id: codeId});

    if (!code) {
        return res.sendStatus(404);
    }

    if (!code.action.includes(action)) {
        return res.sendStatus(400);
    }

    if (code.resourceId != resourceId) {
        return res.sendStatus(400);
    }

    if (code.createdAt + config.get<number>("oneTimeCodeTtl") < Date.now()) {
        await deleteOneTimeCode({_id: codeId});
        return res.sendStatus(410);
    }

    if (action == 'approve') {
        // reset reports - set new creationTimestamp so that users can get the event again
        const event = await findAndUpdateEvent({_id: resourceId}, {reports: 0,  creationTimestamp: Date.now(), $set: { reporters: [] }}, {});
        if (!event) {
            return res.sendStatus(404);
        }

        await deleteOneTimeCode({_id: codeId});

        return res.send(eventApproved);

    } else if (action == 'delete') {
        await deleteEventTransaction(resourceId);
        await deleteOneTimeCode({_id: codeId});
        return res.send(eventDeleted);

    } else {
        return res.sendStatus(400);
    }

}

export async function oneTimeCodeForgotPasswordHandler(
    req: Request<OneTimeCodeInput["params"]>,
    res: Response
) {
    const action = req.params.action;
    const codeId = req.params.codeId;
    const resourceId = req.params.resourceId

    const code = await findOneTimeCode({_id: codeId});

    if (!code) {
        return res.sendStatus(404);
    }

    if (!code.action.includes(action)) {
        return res.sendStatus(400);
    }

    if (code.resourceId != resourceId) {
        return res.sendStatus(400);
    }

    if (code.createdAt + config.get<number>("oneTimeCodeTtl") < Date.now()) {
        await deleteOneTimeCode({_id: codeId});
        return res.sendStatus(410);
    }

    if (action == 'forgotPassword') {
        const user = await findUser({_id: resourceId}, {});
        if (!user) {
            return res.sendStatus(404);
        }

        await deleteOneTimeCode({_id: codeId});

        const newCode = await createOneTimeCode({
            action: ['resetPassword'],
            resourceId: user._id,
            createdAt: Date.now()
        });

        const serverUri = config.get<string>("serverUrl");

        // send html page to set a new password
        return res.send(
            `<!DOCTYPE html>
<html lang="en">

<head>
    <script type="text/javascript">

        async function setNewPassword() {

            let newPassword = document.getElementById("password").value;
            let confirmPassword = document.getElementById("passwordConfirmation").value;

            const url = "${serverUri}" + "/api/users/passwordAction/resetPassword/resetPassword/" + "${newCode._id}" + "/" + "${user._id}";

            const res = await fetch(url, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({password: newPassword, passwordConfirmation: confirmPassword})
            });

            if (res.status === 200) {
                window.location.href =  "${serverUri}" + "/success"
            } else {
                window.location.href =  "${serverUri}" +  "/error"
            }
        }

        function togglePassword(id, imageId) {
            const elementId = document.getElementById(id);
            const imageElement = document.getElementById(imageId);

            if (elementId.type === "password") {
                elementId.type = "text";
                if (imageElement.classList.contains('fa fa-eye')) {
                    imageElement.classList.remove('fa fa-eye')
                }
                imageElement.classList.add('fa-eye-slash');
            } else {
                elementId.type = "password";
                if (imageElement.classList.contains('fa-eye-slash')) {
                    imageElement.classList.remove('fa-eye-slash')
                }
                imageElement.classList.add('fa fa-eye');
            }
        }
    </script>
    <style>
        body {
            text-align: center;
            font-family: "Helvetica", sans-serif;
            background-color: #151B1E;
        }

        h1 {
            color: white;
            font-size: 2em;
            font-weight: bold;
        }

        input {
            border-radius: 5px;
            padding: 5px 10px 8px 10px;
        }

        label {
            color: white;
        }

        customButton {
            color: white;
            background-color: #8250CA;
            border-radius: 5px;
            padding: 5px 10px 8px 10px;
        }

        customInput {
            background-color: #8250CA !important;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0 " charset="UTF-8">
    <title>Reset Password</title>
</head>
<h1>Change Password</h1>

<label for="password">New Password</label>
<input type="password" id="password" name="password" title="New password" class="customInput">
    <button onclick="togglePassword('password', 'toggleButtonPassword')"><i class="fa fa-eye" id="toggleButtonPassword"></i></button>

<p>
    <label for="passwordConfirmation">Confirm Password</label>
    <input type="password" id="passwordConfirmation" name="passwordConfirmation" title="Confirm new password"
           class="customInput"/>
    <button onclick="togglePassword('passwordConfirmation', 'toggleButtonPasswordConfirmation')"><i class="fa fa-eye" id="toggleButtonPasswordConfirmation"></i></button>
</p>
<p class="form-actions">
    <input type="submit" onclick=setNewPassword() value="Change Password" title="Change password" class="customButton">
</p>

</html>`
        );

    } else {
        return res.sendStatus(400);
    }
}

export async function oneTimeCodeResetPasswordHandler(
    req: Request<ResetPasswordInput["params"]>,
    res: Response
) {
    const action = req.params.action;
    const codeId = req.params.codeId;
    const resourceId = req.params.resourceId

    const password = req.body.password;

    const code = await findOneTimeCode({_id: codeId});

    if (!code) {
        return res.sendStatus(400);
    }
    if (!code.action.includes(action)) {
        return res.sendStatus(401);
    }

    if (code.resourceId != resourceId) {
        return res.sendStatus(400);
    }

    if (code.createdAt + config.get<number>("oneTimeCodeTtl") < Date.now()) {
        await deleteOneTimeCode({_id: codeId});
        return res.sendStatus(410);
    }
    if (action == 'resetPassword') {
        const user = await findUser({_id: resourceId}, {});
        if (!user) {
            return res.sendStatus(404);
        }

        // encrypt new password
        const salt = await bcrypt.genSalt(config.get<number>("saltWorkFactor"));
        const hash = bcrypt.hashSync(password, salt);

        // set new password
        await findAndUpdateUser({_id: resourceId}, {password: hash}, {password: 0});

        await deleteOneTimeCode({_id: codeId});

        return res.sendStatus(200);

    } else {
        return res.sendStatus(400);
    }
}