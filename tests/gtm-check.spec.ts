// import { test } from '@playwright/test';
// import { checkGTMImplementation } from '../utils/gtm-check';
// import { gotoAndWait } from '../utils/page-load';
// import { debugGTMInHTML } from '../utils/gtm-debug';

// /**
//  * GTM Check Test
//  * 
//  * Checks if Google Tag Manager is implemented on the page
//  * If GTM is found, outputs the container ID
//  * 
//  * URL can be provided via:
//  * 1. Environment variable: URL_AUDIT_URL
//  * 2. Environment variable: BASE_URL
//  * 3. Default fallback URL
//  */
// const TEST_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';

// test.describe(`GTM Check for: ${TEST_URL}`, () => {
//   test('check if GTM is implemented and get container ID', async ({ page }) => {
//     try {
//       console.log(`\n${'='.repeat(80)}`);
//       console.log(`GTM CHECK`);
//       console.log(`${'='.repeat(80)}`);
//       console.log(`URL: ${TEST_URL}\n`);

//       // Navigate to the page
//       await gotoAndWait(page, TEST_URL);
//       const currentUrl = page.url();
//       console.log(`Loaded: ${currentUrl}\n`);

//       // Debug: Show what's in the HTML
//       await debugGTMInHTML(page);

//       // Check for GTM implementation
//       const gtmResult = await checkGTMImplementation(page);

//       // Output results
//       console.log(`${'='.repeat(80)}`);
//       console.log(`GTM CHECK RESULT`);
//       console.log(`${'='.repeat(80)}`);
      
//       if (gtmResult.hasGTM && gtmResult.containerId) {
//         console.log(`✅ GTM is implemented`);
//         console.log(`📦 Container ID: ${gtmResult.containerId}`);
//       } else {
//         console.log(`❌ GTM is NOT implemented`);
//         console.log(`   ${gtmResult.message}`);
//       }
      
//       console.log(`${'='.repeat(80)}\n`);

//       // Optional: Uncomment to fail test if GTM is not found
//       // if (!gtmResult.hasGTM) {
//       //   throw new Error(`GTM not found: ${gtmResult.message}`);
//       // }

//     } catch (error: any) {
//       console.error(`\n❌ Error checking GTM:`);
//       console.error(`   ${error.message}`);
//       throw error;
//     }
//   });
// });




import { test } from '@playwright/test';

test('DEBUG: log GTM scripts', async ({ page }) => {
  await page.goto('https://mexicocitydating.com/', { waitUntil: 'networkidle' });

  await page.waitForTimeout(5000); // give GTM time

  const gtmScripts = await page.evaluate(() =>
    Array.from(document.scripts)
      .map(s => s.src)
      .filter(src => src.includes('googletagmanager'))
  );

  console.log('GTM scripts:', gtmScripts);
});
