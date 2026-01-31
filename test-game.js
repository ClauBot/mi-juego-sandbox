const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Emular iPhone 12 Pro
    await page.setViewport({
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
    });
    
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    
    // Esperar a que el juego cargue
    await new Promise(r => setTimeout(r, 3000));
    
    // Obtener dimensiones
    const dimensions = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            canvasWidth: canvas ? canvas.width : 'no canvas',
            canvasHeight: canvas ? canvas.height : 'no canvas',
            gameScaleWidth: typeof game !== 'undefined' ? game.scale.width : 'no game',
            gameScaleHeight: typeof game !== 'undefined' ? game.scale.height : 'no game'
        };
    });
    
    console.log('=== DIMENSIONES ===');
    console.log(JSON.stringify(dimensions, null, 2));
    
    // Tomar screenshot
    await page.screenshot({ path: '/tmp/game-test.png' });
    console.log('Screenshot guardado en /tmp/game-test.png');
    
    await browser.close();
})();
