const AWS = require('aws-sdk');
const route53 = new AWS.Route53();

exports.handler = async (event) => {
    try {
        const { subdomain, email } = JSON.parse(event.body);
        const hostedZoneId = process.env.HOSTED_ZONE_ID;
        const baseDomain = process.env.BASE_DOMAIN;
        const ec2Ip = process.env.EC2_IP;
        const fullDomain = `${subdomain}.${baseDomain}`;

        const params = {
            ChangeBatch: {
                Changes: [
                    {
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: fullDomain,
                            Type: 'A',
                            TTL: 300,
                            ResourceRecords: [{ Value: ec2Ip }]
                        }
                    }
                ]
            },
            HostedZoneId: hostedZoneId
        };

        await route53.changeResourceRecordSets(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Subdomain created successfully',
                domain: fullDomain
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error creating subdomain',
                error: error.message
            })
        };
    }
};