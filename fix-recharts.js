const fs = require('fs');
const path = require('path');

const files = [
  'app/(dashboard)/analytics/page.tsx',
  'app/(dashboard)/users/UsersClient.tsx',
  'app/(dashboard)/farmers/page.tsx',
  'app/(dashboard)/farms/page.tsx',
  'app/(dashboard)/clusters/page.tsx',
  'app/(dashboard)/clusters/[id]/page.tsx',
  'app/(dashboard)/agents/AgentsClient.tsx'
];

for (const file of files) {
  const fullPath = path.join('c:/projects/ccsa-deploy/fims-v2', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // We want to replace `<ResponsiveContainer width="100%" height="100%">` 
    // or just `<ResponsiveContainer ` with `<ResponsiveContainer minHeight={0} minWidth={0} `
    // but avoid duplicating if already there.
    if (!content.includes('minHeight={0}')) {
      content = content.replace(/<ResponsiveContainer /g, '<ResponsiveContainer minHeight={0} minWidth={0} ');
      content = content.replace(/<RechartsPrimitive\.ResponsiveContainer /g, '<RechartsPrimitive.ResponsiveContainer minHeight={0} minWidth={0} ');
      fs.writeFileSync(fullPath, content);
      console.log('Updated ' + file);
    }
  }
}
