const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
    try {
        const { domain, email } = JSON.parse(event.body);
        const snsTopicArn = process.env.SNS_TOPIC_ARN;

        await sns.publish({
            TopicArn: snsTopicArn,
            Message: `
                Your Task Manager has been successfully deployed!
                
                Access your application at: https://${domain}
                
                Thank you for using our deployment service.
            `,
            Subject: 'Task Manager Deployment Complete',
            MessageAttributes: {
                'email': {
                    DataType: 'String',
                    StringValue: email
                }
            }
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notification sent successfully'
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error sending notification',
                error: error.message
            })
        };
    }
};