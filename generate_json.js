const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'Kano colleges');
if (!fs.existsSync(dir)) {
  console.error("Directory not found:", dir);
  process.exit(1);
}

const files = fs.readdirSync(dir);

const agentsData = files
  .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
  .map(f => {
    return {
      name: path.parse(f).name,
      imageFile: f
    };
  });

const jsonPath = path.join(dir, 'agents.json');
fs.writeFileSync(jsonPath, JSON.stringify(agentsData, null, 2));
console.log(`Generated JSON file at ${jsonPath} with ${agentsData.length} records.`);
