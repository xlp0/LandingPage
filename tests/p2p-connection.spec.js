const { test, expect } = require('@playwright/test');

test.describe('P2P Serverless Connection Flow', () => {
  test('should complete full P2P connection between two tabs', async ({ browser }) => {
    // Create two browser contexts (simulating two different users/tabs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    // Create pages for each context
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Navigate both pages to the P2P demo
    const demoUrl = 'http://localhost:8000/js/modules/p2p-serverless/example.html';
    await page1.goto(demoUrl);
    await page2.goto(demoUrl);

    // Wait for P2P systems to initialize
    await page1.waitForSelector('#p2p-status:has-text("Ready - Create or accept invitation")');
    await page2.waitForSelector('#p2p-status:has-text("Ready - Create or accept invitation")');

    console.log('✅ Both P2P systems initialized');

    // ========================================
    // STEP 1: Tab 1 - Create Invitation
    // ========================================
    console.log('📤 Step 1: Tab 1 creating invitation...');

    // Click the "Create Invitation" button
    await page1.click('#create-invitation-btn');

    // Wait for the invitation modal to appear
    await page1.waitForSelector('.p2p-invitation-modal', { timeout: 5000 });

    // Extract the invitation code from the modal textarea
    const invitationCode = await page1.locator('.modal-content textarea').inputValue();

    console.log('✅ Invitation code extracted from Tab 1');
    console.log(`📋 Invitation Code: ${invitationCode.substring(0, 50)}...`);

    // ========================================
    // STEP 2: Tab 2 - Accept Invitation
    // ========================================
    console.log('📥 Step 2: Tab 2 accepting invitation...');

    // Click the "Accept Invitation" button on Tab 2
    await page2.click('#accept-invitation-btn');

    // Wait for the browser prompt (we need to handle this via page event)
    const promptPromise = page2.waitForEvent('dialog');

    // The prompt should appear asking for invitation code
    const dialog = await promptPromise;
    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toContain('Paste invitation code from Tab 1');

    // Fill the prompt with the invitation code from Tab 1
    await dialog.accept(invitationCode);

    // Wait for the answer modal to appear
    await page2.waitForSelector('.p2p-invitation-modal', { timeout: 10000 });

    // Extract the answer code from Tab 2's modal
    const answerCode = await page2.locator('.modal-content textarea').inputValue();

    console.log('✅ Answer code generated in Tab 2');
    console.log(`📋 Answer Code: ${answerCode.substring(0, 50)}...`);

    // ========================================
    // STEP 3: Tab 1 - Complete Connection
    // ========================================
    console.log('🔗 Step 3: Tab 1 completing connection...');

    // Click the "Complete Connection" button on Tab 1
    await page1.click('#complete-connection-btn');

    // Wait for the browser prompt
    const completeDialogPromise = page1.waitForEvent('dialog');
    const completeDialog = await completeDialogPromise;
    expect(completeDialog.type()).toBe('prompt');
    expect(completeDialog.message()).toContain('Paste answer code from Tab 2');

    // Fill the prompt with the answer code from Tab 2
    await completeDialog.accept(answerCode);

    // ========================================
    // STEP 4: Verify Connection Established
    // ========================================
    console.log('🔍 Step 4: Verifying connection...');

    // Wait for connection to be established
    await page1.waitForSelector('#p2p-status:has-text("Connected to 1 peer")', { timeout: 15000 });
    await page2.waitForSelector('#p2p-status:has-text("Connected to 1 peer")', { timeout: 15000 });

    // Verify peer counts
    const peerCount1 = await page1.locator('#peer-count').textContent();
    const peerCount2 = await page2.locator('#peer-count').textContent();

    expect(peerCount1).toBe('1');
    expect(peerCount2).toBe('1');

    // Check that peers are listed
    await expect(page1.locator('#peer-list')).toContainText('connected');
    await expect(page2.locator('#peer-list')).toContainText('connected');

    console.log('✅ Connection established successfully!');

    // ========================================
    // STEP 5: Test Messaging (Optional)
    // ========================================
    console.log('💬 Step 5: Testing message exchange...');

    // Send a message from Tab 1
    await page1.fill('#message-input', 'Hello from Tab 1 - Automated test!');
    await page1.click('#send-message-btn');

    // Wait for message to appear in Tab 1's log
    await page1.waitForSelector('#p2p-messages:has-text("Broadcast:")', { timeout: 5000 });

    // Send a message from Tab 2
    await page2.fill('#message-input', 'Hello from Tab 2 - Automated test reply!');
    await page2.click('#send-message-btn');

    // Wait for message to appear in Tab 2's log
    await page2.waitForSelector('#p2p-messages:has-text("Broadcast:")', { timeout: 5000 });

    console.log('✅ Message exchange working!');

    // ========================================
    // STEP 6: Test Disconnect (Optional)
    // ========================================
    console.log('🔌 Step 6: Testing disconnect...');

    // Click disconnect on Tab 1
    await page1.click('text=Disconnect');

    // Wait for disconnection
    await page1.waitForSelector('#p2p-status:not(:has-text("Connected"))', { timeout: 5000 });
    await page2.waitForSelector('#p2p-status:not(:has-text("Connected"))', { timeout: 5000 });

    console.log('✅ Disconnect functionality working!');

    // Cleanup
    await context1.close();
    await context2.close();

    console.log('🎉 P2P Serverless test completed successfully!');
  });

  test('should handle connection timeouts gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:8000/js/modules/p2p-serverless/example.html');

    // Test with expired invitation code
    const expiredCode = 'eyJ2ZXJzaW9uIjoiMS4wIiwicGVlcklkIjoicGVlci0xNzYyNTI3Mjc5NjIyLWpncHV5MGhsMiIsIm9mZmVyIjp7InR5cGUiOiJvZmZlciIsInNkcCI6InY9MFxyXG5vPS0gODYzODY0Mzk5OTE0NzA4ODcwNyAyIElOIElQNCAxMjcuMC4wLjFcclxucz0tXHJcbnQ9MCAwXHJcbmE9Z3JvdXA6QlVORExFIDBcclxuYT1leHRtYXAtYWxsb3ctbWl4ZWRcclxuYT1tc2lkLXNlbWFudGljOiBXTVNcclxubT1hcHBsaWNhdGlvbiA1OTcyOCBVRFAvRFRMUy9TQ1RQIHdlYnJ0Yy1kYXRhY2hhbm5lbFxyXG5jPUlOIElQNCAxMjUuMTYyLjEyOS4yNTFcclxuYT1jYW5kaWRhdGU6Mzc4NjE5MjI3NiAxIHVkcCAyMTEzOTM3MTUxIDkxZjY2NWNkLTM0MGItNGE4ZC05OTdkLWY2ZjM1NDFmODU4MS5sb2NhbCA1OTcyOCB0eXAgaG9zdCBnZW5lcmF0aW9uIDAgbmV0d29yay1jb3N0IDk5OVxyXG5hPWNhbmRpZGF0ZTo0Mjg0NTEzMzgzIDEgdWRwIDE2Njc3Mjk1MzUgMTI1LjE2Mi4xMjkuMjUxIDU5NzI4IHR5cCBzcmZseCByYWRkciAwLjAuMC4wIHJwb3J0IDAgZ2VuZXJhdGlvbiAwIG5ldHdvcmstY29zdCA5OTlcclxuYT1pY2UtdWZyYWc6UDAzSlxyXG5hPWljZS1wd2Q6MlpiUGV2Q3hxTVhkMTZkbm5nSVVRTndiXHJcbmE9aWNlLW9wdGlvbnM6dHJpY2tsZVxyXG5hPWZpbmdlcnByaW50OnNoYS0yNTYgMEM6Mjg6QUE6MUU6RDU6Rjc6MkQ6REU6MTk6NDM6NTE6QzU6RUU6ODI6NkI6QjI6NkY6NkU6ODk6NDg6MjY6MzU6RkU6RkE6NUY6N0Q6MEQ6RDA6MUI6NDc6MTk6MzlcclxuYT1zZXR1cDphY3RwYXNzXHJcbmE9bWlkOjBcclxuYT1zY3RwLXBvcnQ6NTAwMFxyXG5hPW1heC1tZXNzYWdlLXNpemU6MjYyMTQ0XHJcbiJ9LCJpY2UiOlt7ImNhbmRpZGF0ZSI6ImNhbmRpZGF0ZTozNzg2MTkyMjc2IDEgdWRwIDIxMTM5MzcxNTEgOTFmNjY1Y2QtMzQwYi00YThkLTk5N2QtZjZmMzU0MWY4NTgxLmxvY2FsIDU5NzI4IHR5cCBob3N0IGdlbmVyYXRpb24gMCB1ZnJhZyBQMDNKIG5ldHdvcmstY29zdCA5OTkiLCJzZHBNaWQiOiIwIiwic2RwTUxpbmVJbmRleCI6MCwidXNlcm5hbWVGcmFnbWVudCI6IlAwM0oifSx7ImNhbmRpZGF0ZSI6ImNhbmRpZGF0ZTo0Mjg0NTEzMzgzIDEgdWRwIDE2Njc3Mjk1MzUgMTI1LjE2Mi4xMjkuMjUxIDU5NzI4IHR5cCBzcmZseCByYWRkciAwLjAuMC4wIHJwb3J0IDAgZ2VuZXJhdGlvbiAwIHVmcmFnIFAwM0ogbmV0d29yay1jb3N0IDk5OSIsInNkcE1pZCI6IjAiLCJzZHBNTGluZUluZGV4IjowLCJ1c2VybmFtZUZyYWdtZW50IjoiUDAzSiJ9XSwidGltZXN0YW1wIjoxNzYyNTI3MjgwMDk0LCJleHBpcmVzIjoxNzYyNTI3NTgwMDk0fQ';

    await page.click('#accept-invitation-btn');

    const dialog = await page.waitForEvent('dialog');
    await dialog.accept(expiredCode);

    // Should show error message
    await page.waitForSelector('#p2p-status:has-text("Failed")', { timeout: 5000 });

    await context.close();
  });
});
