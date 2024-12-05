const AWS = require('aws-sdk');
const { execSync } = require('child_process');
const fs = require('fs');

exports.handler = async (event) => {
    try {
        const { domain, email } = JSON.parse(event.body);
        const repoUrl = process.env.GITHUB_REPO_URL;
        const deployPath = `${process.env.DEPLOY_PATH}/${domain}`;

        // Clone repository
        execSync(`git clone ${repoUrl} ${deployPath}`);

        // Configure Apache virtual host
        const vhostConfig = `
            <VirtualHost *:80>
                ServerName ${domain}
                DocumentRoot ${deployPath}
                <Directory ${deployPath}>
                    AllowOverride All
                    Require all granted
                </Directory>
            </VirtualHost>
        `;

        fs.writeFileSync(`/etc/apache2/sites-available/${domain}.conf`, vhostConfig);
        execSync(`a2ensite ${domain}.conf`);
        execSync('service apache2 reload');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Application deployed successfully',
                domain: domain
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error deploying application',
                error: error.message
            })
        };
    }
};