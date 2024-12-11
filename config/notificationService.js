const nodemailer = require("nodemailer");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Twilio Account SID
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Twilio Auth Token
const client = twilio(accountSid, authToken);

/**
 * Send email notifications.
 */
const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error("Error sending email:", error.message);
    }
};

/**
 * Send SMS notifications.
 */
const sendSMS = async (to, message) => {
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to, // Phone number in E.164 format
        });
        console.log(`SMS sent to ${to}`);
    } catch (error) {
        console.error("Error sending SMS:", error.message);
    }
};

/**
 * Generic notification sender.
 */
const sendNotification = async ({ type, to, subject, message }) => {
    switch (type) {
        case "email":
            await sendEmail(to, subject, message);
            break;
        case "sms":
            await sendSMS(to, message);
            break;
        default:
            console.error("Invalid notification type");
    }
};

module.exports = {
    sendNotification,
};
