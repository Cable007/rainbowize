document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get the frame count and add it to the form data
    const frameCount = document.getElementById('frameCount').value;
    formData.append('frameCount', frameCount);

    const messageElement = document.getElementById('message');
    const outputImage = document.getElementById('outputImage');
    const downloadLink = document.getElementById('downloadLink');

    messageElement.textContent = `Processing... Generating ${frameCount} frames. This may take a moment.`;
    outputImage.style.display = 'none';
    downloadLink.style.display = 'none';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        // Response is now a GIF, so we set the MIME type accordingly
        const imageBlob = await response.blob();
        
        const imageUrl = URL.createObjectURL(imageBlob);

        // Update image source and download link for the GIF
        outputImage.src = imageUrl;
        outputImage.style.display = 'block';
        
        downloadLink.href = imageUrl;
        downloadLink.download = 'rainbow_shift_animated.gif'; // Ensure correct file name
        downloadLink.style.display = 'block';

        messageElement.textContent = 'Animated Rainbow GIF complete!';

    } catch (error) {
        console.error('Upload failed:', error);
        messageElement.textContent = `Error: Could not process image. Check console for details.`;
    }
});
