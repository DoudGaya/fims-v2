const fs = require('fs');

const filePath = 'c:/projects/ccsa-deploy/fims-v2/lib/emailService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the CSS
content = content.replace(/\.header \{ background-color: #013358; color: white; padding: 20px; text-align: center; \}/g, 
  '.header { background-color: #013358; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }\n            .header img { border-radius: 50%; margin-bottom: 10px; background-color: white; padding: 4px; }\n            .content { padding: 30px; background-color: #ffffff; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; }\n            body { background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }');

// We also need to remove the old .content definition since we injected a new one
content = content.replace(/\.content \{ padding: 20px; background-color: #f9f9f9; \}/g, '');

// Replace the header HTML for each instance
// 1. Password Reset
content = content.replace(
  /<div class="header">\s*<h1>CCSA Admin<\/h1>\s*<p>Farmers Information Management System<\/p>\s*<\/div>/g,
  `<div class="header">
              <img src="\${process.env.NEXTAUTH_URL}/favicon.ico" alt="CCSA Logo" width="56" height="56" />
              <h1 style="margin: 0; font-size: 24px;">CCSA Admin</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Farmers Information Management System</p>
            </div>`
);

// 2. Agent Status
content = content.replace(
  /<div class="header">\s*<h1>CCSA Field Agent Programme<\/h1>\s*<\/div>/g,
  `<div class="header">
              <img src="\${process.env.NEXTAUTH_URL}/favicon.ico" alt="CCSA Logo" width="56" height="56" />
              <h1 style="margin: 0; font-size: 24px;">CCSA Field Agent Programme</h1>
            </div>`
);

// 3. API Access Request
content = content.replace(
  /<div class="header">\s*<h1>CCSA FIMS API<\/h1>\s*<p>Access Request Notification<\/p>\s*<\/div>/g,
  `<div class="header">
              <img src="\${process.env.NEXTAUTH_URL}/favicon.ico" alt="CCSA Logo" width="56" height="56" />
              <h1 style="margin: 0; font-size: 24px;">CCSA FIMS API</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Access Request Notification</p>
            </div>`
);

// 4. Custom Email
content = content.replace(
  /<div class="header">\s*<h1>CCSA Admin<\/h1>\s*<\/div>/g,
  `<div class="header">
              <img src="\${process.env.NEXTAUTH_URL}/favicon.ico" alt="CCSA Logo" width="56" height="56" />
              <h1 style="margin: 0; font-size: 24px;">CCSA Admin</h1>
            </div>`
);

fs.writeFileSync(filePath, content);
console.log('emailService.ts updated.');
