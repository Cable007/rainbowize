const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const port = 3000;

// Middleware Setup
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname)));

/**
 * Generates a dynamic, horizontal rainbow overlay buffer using sine waves.
 * This is the core 'rainbow shift' logic.
 */
async function createRainbowOverlay(width, height) {
    const channels = 3; // RGB
    const rawData = Buffer.alloc(width * height * channels); 
    const frequency = 0.05; // Spacing of the waves
    const phaseShift = 0;   // Static phase for a single image

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * channels;
            
            // Use sine waves for smooth, shifting color transitions (0 to 255)
            // Phase offsets (0, 2pi/3, 4pi/3) create the R-G-B cycle
            
            // Red Channel (R)
            const r = Math.floor((Math.sin(frequency * x + phaseShift + 0) + 1) * 127.5);
            // Green Channel (G)
            const g = Math.floor((Math.sin(frequency * x + phaseShift + (2 * Math.PI / 3)) + 1) * 127.5);
            // Blue Channel (B)
            const b = Math.floor((Math.sin(frequency * x + phaseShift + (4 * Math.PI / 3)) + 1) * 127.5);
            
            rawData[i] = r;      
            rawData[i + 1] = g;  
            rawData[i + 2] = b;  
        }
    }

    // Convert the raw buffer into a sharp image buffer
    return sharp(rawData, {
        raw: {
            width: width,
            height: height,
            channels: channels
        }
    })
    .toFormat('png')
    .png({ quality: 90 })
    .toBuffer();
}


// POST endpoint for file processing
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const imageBuffer = req.file.buffer;

        // 1. Get original image dimensions
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;

        if (!width || !height) {
            return res.status(500).send('Could not read image dimensions.');
        }

        // 2. Create the custom rainbow overlay
        const rainbowBuffer = await createRainbowOverlay(width, height);
        
        // 3. Composite (blend) the original image with the rainbow layer
        const processedImageBuffer = await sharp(imageBuffer)
            .composite([{ 
                input: rainbowBuffer, 
                // 'overlay' blend mode gives a classic color-shift look
                blend: 'overlay', 
                tile: false 
            }])
            .toFormat('png') 
            .toBuffer();

        // 4. Send the result back to the client
        res.type('image/png').send(processedImageBuffer);

    } catch (error) {
        console.error('Image processing failed:', error);
        res.status(500).send('Server-side image processing failed.');
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
