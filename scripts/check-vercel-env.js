// Verify Vercel Environment Variables
// Run this to check if your Vercel project has the required environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

console.log('🔍 Checking Vercel environment variables...\n');

try {
  const output = execSync('vercel env ls', { encoding: 'utf-8' });
  console.log(output);
  
  if (output.includes('FIREBASE_SERVICE_ACCOUNT')) {
    console.log('✅ FIREBASE_SERVICE_ACCOUNT is configured on Vercel');
  } else {
    console.log('❌ FIREBASE_SERVICE_ACCOUNT is NOT configured on Vercel');
    console.log('\n📝 To fix this:');
    console.log('1. Run: vercel env add FIREBASE_SERVICE_ACCOUNT');
    console.log('2. Paste the value from your .env.local file');
    console.log('3. Select: Production, Preview, Development');
    console.log('4. Redeploy: vercel --prod');
  }
} catch (error) {
  console.error('Error checking Vercel environment:', error.message);
  console.log('\n💡 Make sure you are logged in to Vercel CLI:');
  console.log('   vercel login');
}
