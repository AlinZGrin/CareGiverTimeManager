// This script clears the initialization flag so Firebase will reinitialize
// Run with: node clear-init.js
// Since this is a browser-based app, we can't directly clear localStorage
// But we can document how to do it
console.log('To clear initialization flag and reinitialize Firebase:');
console.log('1. Open http://localhost:3000/sync');
console.log('2. Or open browser DevTools (F12) -> Console and run:');
console.log('   localStorage.removeItem("cgtm_initialized")');
console.log('   localStorage.removeItem("cgtm_users")');
console.log('   location.reload()');
