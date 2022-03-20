"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = require("../../../../../supertokens");
function getPasswordResetEmailContent(input) {
    let supertokens = supertokens_1.default.getInstanceOrThrowError();
    let appName = supertokens.appInfo.appName;
    let body = getPasswordResetEmailHTML(appName, input.user.email, input.passwordResetLink);
    return {
        body,
        toEmail: input.user.email,
        subject: "Reset password instructions",
    };
}
exports.default = getPasswordResetEmailContent;
function getPasswordResetEmailHTML(appName, email, resetLink) {
    return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="utf-8"> <!-- utf-8 works for most cases -->
        <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
        <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
        <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no"> <!-- Tell iOS not to automatically link certain text strings. -->
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500&display=swap" rel="stylesheet" type="text/css">

        <!-- What it does: Makes background images in 72ppi Outlook render at correct size. -->
        <!--[if gte mso 9]>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->

        <!-- Web Font / @font-face : BEGIN -->
        <!-- NOTE: If web fonts are not required, lines 23 - 41 can be safely removed. -->

        <!-- Desktop Outlook chokes on web font references and defaults to Times New Roman, so we force a safe fallback font. -->
        <!--[if mso]>
            <style>
                * {
                    font-family: sans-serif !important;
                }
            </style>
        <![endif]-->

        <!-- All other clients get the webfont reference; some will render the font and others will silently fail to the fallbacks. More on that here: http://stylecampaign.com/blog/2015/02/webfont-support-in-email/ -->
        <!--[if !mso]><!-->
        <!-- insert web font reference, eg: <link href='https://fonts.googleapis.com/css?family=Roboto:400,700' rel='stylesheet' type='text/css'> -->
        <!--<![endif]-->

        <!-- Web Font / @font-face : END -->

        <!-- CSS Reset : BEGIN -->
        <style>

            /* What it does: Tells the email client that only light styles are provided but the client can transform them to dark. A duplicate of meta color-scheme meta tag above. */
            :root {
            color-scheme: light;
            supported-color-schemes: light;
            }
            @font-face {
                font-family: 'Rubik';
                src: url("https://fonts.googleapis.com/css2?family=Rubik:wght@300;500&display=swap")
            }
            /* What it does: Remove spaces around the email design added by some email clients. */
            /* Beware: It can remove the padding / margin and add a background color to the compose a reply window. */
            html,
            body {
                margin: 0 auto !important;
                padding: 0 !important;
                height: 100% !important;
                width: 100% !important;
            }

            /* What it does: Stops email clients resizing small text. */
            * {
                -ms-text-size-adjust: 100%;
                -webkit-text-size-adjust: 100%;
            }

            /* What it does: Centers email on Android 4.4 */
            div[style*="margin: 16px 0"] {
                margin: 0 !important;
            }

            /* What it does: forces Samsung Android mail clients to use the entire viewport */
            #MessageViewBody, #MessageWebViewDiv{
                width: 100% !important;
            }

            /* What it does: Stops Outlook from adding extra spacing to tables. */
            table,
            td {
                mso-table-lspace: 0pt !important;
                mso-table-rspace: 0pt !important;
            }

            /* What it does: Replaces default bold style. */
            th {
                font-weight: normal;
            }

            /* What it does: Fixes webkit padding issue. */
            table {
                border-spacing: 0 !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                margin: 0 auto !important;
            }

            /* What it does: Prevents Windows 10 Mail from underlining links despite inline CSS. Styles for underlined links should be inline. */
            a {
                text-decoration: none;
            }

            /* What it does: Uses a better rendering method when resizing images in IE. */
            img {
                -ms-interpolation-mode:bicubic;
            }

            /* What it does: A work-around for email clients meddling in triggered links. */
            a[x-apple-data-detectors],  /* iOS */
            .unstyle-auto-detected-links a,
            .aBn {
                border-bottom: 0 !important;
                cursor: default !important;
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }

            /* What it does: Prevents Gmail from changing the text color in conversation threads. */
            .im {
                color: inherit !important;
            }

            /* What it does: Prevents Gmail from displaying a download button on large, non-linked images. */
            .a6S {
            display: none !important;
            opacity: 0.01 !important;
            }
            /* If the above doesn't work, add a .g-img class to any image in question. */
            img.g-img + div {
            display: none !important;
            }

            /* What it does: Removes right gutter in Gmail iOS app: https://github.com/TedGoas/Cerberus/issues/89  */
            /* Create one of these media queries for each additional viewport size you'd like to fix */

            /* iPhone 4, 4S, 5, 5S, 5C, and 5SE */
            @media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
                u ~ div .email-container {
                    min-width: 320px !important;
                }
                .browser-only {
                    display: none;
                }
            }
            /* iPhone 6, 6S, 7, 8, and X */
            @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
                u ~ div .email-container {
                    min-width: 375px !important;
                }
                .browser-only {
                    display: none;
                }
            }
            /* iPhone 6+, 7+, and 8+ */
            @media only screen and (min-device-width: 414px) {
                u ~ div .email-container {
                    min-width: 414px !important;
                }
                .browser-only {
                    display: none;
                }
            }

            /* iPhone 6+, 7+, and 8+ */
            @media only screen and (min-device-width: 720px) {
                .browser-only {
                    display: block;
                    border: none;
                }
            }

        </style>
        <!-- CSS Reset : END -->

        <!-- Progressive Enhancements : BEGIN -->
        <style>

            /* What it does: Hover styles for buttons */
            .button-td,
            .button-a {
                transition: all 100ms ease-in;
            }
            .button-td-primary:hover,
            .button-a-primary:hover {
                background: #555555 !important;
                border-color: #555555 !important;
            }

            /* Media Queries */
            @media screen and (max-width: 600px) {

                .email-container {
                    width: 100% !important;
                    margin: auto !important;
                }

                /* What it does: Forces table cells into full-width rows. */
                .stack-column,
                .stack-column-center {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    direction: ltr !important;
                }
                /* And center justify these ones. */
                .stack-column-center {
                    text-align: center !important;
                }

                /* What it does: Generic utility class for centering. Useful for images, buttons, and nested tables. */
                .center-on-narrow {
                    text-align: center !important;
                    display: block !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    float: none !important;
                }
                table.center-on-narrow {
                    display: inline-block !important;
                }

                /* What it does: Adjust typography on small screens to improve readability */
                .email-container p {
                    font-size: 17px !important;
                }
            }

        </style>
        <!-- Progressive Enhancements : END -->

    </head>
    <!--
        The email background color (#222222) is defined in three places:
        1. body tag: for most email clients
        2. center tag: for Gmail and Inbox mobile apps and web versions of Gmail, GSuite, Inbox, Yahoo, AOL, Libero, Comcast, freenet, Mail.ru, Orange.fr
        3. mso conditional: For Windows 10 Mail
    -->
    <body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: white;">
    <center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: white;">
        <!--[if mso | IE]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #222222;">
        <tr>
        <td>
        <![endif]-->

            <!-- Visually Hidden Preheader Text : BEGIN -->
            <div style="max-height:0; overflow:hidden; mso-hide:all;" aria-hidden="true">
                Password Reset Request for ${appName}
            </div>
            <!-- Visually Hidden Preheader Text : END -->

            <!-- Create white space after the desired preview text so email clients don’t pull other distracting text into the inbox preview. Extend as necessary. -->
            <!-- Preview Text Spacing Hack : BEGIN -->
            <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
                &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
            </div>
            <!-- Preview Text Spacing Hack : END -->

            <!-- Email Body : BEGIN -->
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="550" style="margin: auto;" class="email-container">
                <!-- Email Header : BEGIN -->
                <!-- <tr>
                    <td style="padding: 20px 0; text-align: center">
                        <img src="https://via.placeholder.com/200x50" width="200" height="50" alt="alt_text" border="0" style="height: auto; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555;">
                    </td>
                </tr> -->
                <!-- Email Header : END -->

                <!-- Hero Image, Flush : BEGIN -->
                <!-- <tr>
                    <td style="background-color: #ffffff;">
                        <img src="https://via.placeholder.com/1200x600" width="600" height="" alt="alt_text" border="0" style="width: 100%; max-width: 600px; height: auto; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555; margin: auto; display: block;" class="g-img">
                    </td>
                </tr> -->
                <!-- Hero Image, Flush : END -->

                <!-- Clear Spacer : BEGIN -->
                <!-- <tr class="browser-only" style="padding:20px;">
                    <td aria-hidden="true" height="40" style="font-size: 0px; line-height: 0px;">
                        &nbsp;
                    </td>
                </tr> -->
                <!-- Clear Spacer : END -->

                <!-- 1 Column Text + Button : BEGIN -->
                <tr>
                    <td style="background-color: #ffffff;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="text-align: center; font-size: 17px; line-height: 24px; color: #000000;">
                                    <p style="margin: 0 0 0px; color: #000000; font-family: 'Rubik', sans-serif; font-weight: 500; padding: 40px 50px 40px 50px;">A password reset request for your account on ${appName} has been received.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 20px 10px;">
                                    <!-- Button : BEGIN -->
                                    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;">
                                        <tr>
                                            <td class="button-td button-td-primary" style="border-radius: 6px;">
                                                <a class="button-a button-a-primary" href="${resetLink}" target="_blank" style="background: rgb(82, 181, 110); font-size: 17px; line-height: 24px; font-weight: 500; font-family: 'Rubik', sans-serif; text-decoration: none; padding: 9px 25px 9px 25px; color: #ffffff; display: block; border-radius: 6px;">Reset Password</a>
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- Button : END -->
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-top: 30px;">
                                    <hr style="margin:auto; color: #808080; max-width: 75%; border: 0.5px solid #808080;">
                                </td>
                            </tr>
                            <tr>
                                <td valign="middle" style="text-align: center; padding-top: 20px; padding-bottom: 35px; font-family: 'Rubik', sans-serif; font-weight: 300; font-size: 17px; line-height: 20px; color: #626262;">
                                    <p style="margin: 0;">This email was meant for ${email}</p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
                <!-- 1 Column Text + Button : END -->

                <!-- Clear Spacer : BEGIN -->
                <!-- <tr class="browser-only" style="padding:20px;">
                    <td aria-hidden="true" height="40" style="font-size: 0px; line-height: 0px;">
                        &nbsp;
                    </td>
                </tr> -->
                <!-- Clear Spacer : END -->
            </table>
            <!-- Email Body : END -->
        <!--[if mso | IE]>
        </td>
        </tr>
        </table>
        <![endif]-->
        </center>
    </body>
    </html>
    `;
}
