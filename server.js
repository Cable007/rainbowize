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
 * Generates a single frame of the rainbow overlay based on a phase shift value.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @param {number} phaseShift - Value that determines the color shift position.
 * @returns {Promise<Buffer>} - A Buffer representing a single PNG overlay frame.
 */
async function createRainbowOverlayFrame(width, height, phaseShift) {
    const channels = 3; // RGB
    const rawData = Buffer.alloc(width * height * channels); 
    const frequency = 0.05; // Spacing of the waves across the image

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * channels;
            
            // The phaseShift parameter makes the colors move across the frame
            
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

    // Convert the raw buffer into a sharp image buffer (PNG format for blending)
    return sharp(rawData, {
        raw: {
            width: width,
            height: height,
            channels: channels
        }
    })
    .toFormat('png')
    .toBuffer();
}


// POST endpoint for file processing
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file || !req.body.frameCount) {
        return res.status(400).send('File and frame count required.');
    }

    const frameCount = parseInt(req.body.frameCount);
    if (isNaN(frameCount) || frameCount < 5 || frameCount > 100) {
        return res.status(400).send('Invalid frame count.');
    }
    
    try {
        const imageBuffer = req.file.buffer;
        
        // Get original image dimensions
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;

        const frameBuffers = [];
        const phaseIncrement = (2 * Math.PI) / frameCount; // Cycle through a full 2π cycle
        
        // 1. Loop to generate and composite each frame
        for (let i = 0; i < frameCount; i++) {
            const currentPhase = i * phaseIncrement;
            
            // Generate the rainbow overlay with the current shift
            const rainbowOverlay = await createRainbowOverlayFrame(width, height, currentPhase);
            
            // Composite the original image with the shifted rainbow overlay
            const compositeFrame = await sharp(imageBuffer)
                .composite([{ 
                    input: rainbowOverlay, 
                    blend: 'overlay', // or 'screen', 'hue' for different effects
                    tile: false 
                }])
                .toFormat('png') // Output as PNG buffer for sharp's GIF processing
                .toBuffer();
                
            frameBuffers.push(compositeFrame);
        }

        // 2. Compile the frames into a single animated GIF
        const gifBuilder = sharp(frameBuffers[0]); // Start with the first frame
        
        // Add remaining frames and configure GIF
        gifBuilder.join(frameBuffers.slice(1), { 
            animated: true, 
            delay: 100 // 100ms delay per frame (10 FPS)
        });
        
        const finalGifBuffer = await gifBuilder
            .toFormat('gif')
            .toBuffer();

        // 3. Send the resulting animated GIF back to the client
        res.type('image/gif').send(finalGifBuffer);

    } catch (error) {
        console.error('Image processing failed:', error);
        res.status(500).send('Server-side image processing failed.');
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
