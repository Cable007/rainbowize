document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const messageElement = document.getElementById('message');
    const outputImage = document.getElementById('outputImage');
    const downloadLink = document.getElementById('downloadLink');

    // Reset and display loading message
    messageElement.textContent = 'Processing... Applying rainbow shift.';
    outputImage.style.display = 'none';
    downloadLink.style.display = 'none';

    try {
        // Send the file to the server's /upload endpoint
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        // Get the processed image data as a Blob (binary data)
        const imageBlob = await response.blob();
        
        // Create a temporary local URL for the Blob
        const imageUrl = URL.createObjectURL(imageBlob);

        // Display the image
        outputImage.src = imageUrl;
        outputImage.style.display = 'block';
        
        // Set the download link
        downloadLink.href = imageUrl;
        downloadLink.style.display = 'block';

        messageElement.textContent = 'Rainbow Shift complete! See result below.';

    } catch (error) {
        console.error('Upload failed:', error);
        messageElement.textContent = `Error: Could not process image. Check console for details.`;
    }
});
