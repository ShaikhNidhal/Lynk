const fs = require('fs');
const path = require('path');

function run() {
  const rootDir = process.cwd();
  console.log('Searching for Firebase Service Account JSON files...');

  const files = fs.readdirSync(rootDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  let serviceAccountFile = null;
  let serviceAccountData = null;

  for (const file of jsonFiles) {
    try {
      const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
      const data = JSON.parse(content);
      if (data.type === 'service_account') {
        serviceAccountFile = file;
        serviceAccountData = data;
        break;
      }
    } catch (e) {
      // Ignore invalid JSON
    }
  }

  if (!serviceAccountFile || !serviceAccountData) {
    console.error('\n❌ No Firebase Service Account JSON file found in the root directory.');
    console.log('\nTo fix this:');
    console.log('1. Go to Firebase Console -> Project Settings -> Service Accounts.');
    console.log('2. Click "Generate new private key" to download the credentials JSON file.');
    console.log('3. Move the downloaded JSON file into this project directory.');
    console.log('4. Run this script again: node setup-env.js');
    process.exit(1);
  }

  console.log(`Found service account file: ${serviceAccountFile}`);

  const envPath = path.join(rootDir, '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const projectId = serviceAccountData.project_id;
  const clientEmail = serviceAccountData.client_email;
  const privateKey = serviceAccountData.private_key;

  // Standardize the private key to be inline with escaped newlines
  const escapedPrivateKey = privateKey.replace(/\n/g, '\\n');

  // Update or append values
  const updates = {
    'FIREBASE_ADMIN_CLIENT_EMAIL': clientEmail,
    'FIREBASE_ADMIN_PRIVATE_KEY': `"${escapedPrivateKey}"`,
  };

  let lines = envContent.split('\n');

  for (const [key, value] of Object.entries(updates)) {
    let keyExists = false;
    lines = lines.map(line => {
      if (line.trim().startsWith(`${key}=`)) {
        keyExists = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!keyExists) {
      lines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log(`\n✅ Successfully configured .env file with credentials!`);
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Client Email: ${clientEmail}`);
  console.log(`\nPlease restart your development server (npm run dev) to apply changes.`);
}

run();
