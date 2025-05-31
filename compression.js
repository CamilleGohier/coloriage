function compressImage(rawPixels, width, height, scale, nbColors) {
    const organisedPixels = [];

    let index = 0;
    for (let x = 0; x < height; x++) {
        let pixelsLine = [];
        for (let y = 0; y < width; y++) {
            pixelsLine.push([rawPixels[index], rawPixels[index + 1], rawPixels[index + 2]]);
            index += 4;
        }
        organisedPixels.push(pixelsLine);
    }

    const { resizedPixels, newWidth, newHeight } = imageSizeCompression(organisedPixels, width, height, scale);
    const { grid, palette } = imageColorCompression(resizedPixels, nbColors, newWidth, newHeight);
    console.log(grid);
    console.log(palette);
}

function getColors(pixels, height, width) {
    let colorSet = new Set();
    let colors = [];

    for (let x = 0; x < height; x++) {
        for (let y = 0; y < width; y++) {
            const [r, g, b] = pixels[x][y];
            const color = `${r}_${g}_${b}`;

            if (!colorSet.has(color)) {
                colorSet.add(color);
                colors.push([r, g, b]);
            }
        }
    }
    return colors;
}

function getInitialCentroids(pixels, width, height, nbColors) {
    let colors = getColors(pixels, height, width);
    let centroids = new Array(nbColors);

    for (let nbCentroids = 0; nbCentroids < nbColors; nbCentroids++) {
        centroids[nbCentroids] = {
            center: colors[Math.floor(Math.random() * colors.length)],
            pixels: []
        };
    }
    return centroids;
}

function fillClusters(height, width, centroids, pixels, nbColors) {
    for (let x = 0; x < height; x++) {
        for (let y = 0; y < width; y++) {
            let bestDistance = 1000;
            let bestPos = -1;
            for (let posClus = 0; posClus < nbColors; posClus++) {
                let squareX = Math.pow(centroids[posClus].center[0] - pixels[x][y][0], 2);
                let squareY = Math.pow(centroids[posClus].center[1] - pixels[x][y][1], 2);
                let squareZ = Math.pow(centroids[posClus].center[2] - pixels[x][y][2], 2);
                let distance = Math.sqrt(squareX + squareY + squareZ);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestPos = posClus;
                }
            }
            centroids[bestPos].pixels.push(pixels[x][y]);
        }
    }

    return centroids;
}

function updateCentroids(centroids, nbColors) {
    let newCentroids = new Array(nbColors);

    for (let posClus = 0; posClus < nbColors; posClus++) {
        let meanR = 0, meanG = 0, meanB = 0;

        centroids[posClus].pixels.forEach(pixel => {
            meanR += pixel[0];
            meanG += pixel[1];
            meanB += pixel[2];
        });

        meanR = Math.floor(meanR / (centroids[posClus].pixels.length)) || 0;
        meanG = Math.floor(meanG / (centroids[posClus].pixels.length)) || 0;
        meanB = Math.floor(meanB / (centroids[posClus].pixels.length)) || 0;

        newCentroids[posClus] = {
            center: [meanR, meanG, meanB],
            pixels: []
        };
    }
    return newCentroids;
}

function imageColorCompression(pixels, nbColors, width, height) {
    let centroids = getInitialCentroids(pixels, width, height, nbColors);
    centroids = fillClusters(height, width, centroids, pixels, nbColors);
    let oldCentroids = centroids;
    centroids = updateCentroids(oldCentroids, nbColors);

    let grid = pixels;
    for (let x = 0; x < height; x++) {
        for (let y = 0; y < width; y++) {
            let bestDistance = 1000;
            let bestPos = -1;
            for (let posClus = 0; posClus < nbColors; posClus++) {
                let squareX = Math.pow(centroids[posClus].center[0] - pixels[x][y][0], 2);
                let squareY = Math.pow(centroids[posClus].center[1] - pixels[x][y][1], 2);
                let squareZ = Math.pow(centroids[posClus].center[2] - pixels[x][y][2], 2);
                let distance = Math.sqrt(squareX + squareY + squareZ);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestPos = posClus;
                }
            }
            grid[x][y] = bestPos + 1;
        }
    }

    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    const rgbToHex = (r, g, b) => {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    let palette = [];
    for (let curCentroid = 0; curCentroid < centroids.length; curCentroid++)
        palette.push(rgbToHex(centroids[curCentroid].center[0], centroids[curCentroid].center[1], centroids[curCentroid].center[2]));

    return { grid, palette };
}

function imageSizeCompression(organisedPixels, width, height, scale) {
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    const resizedPixels = [];

    for (let x = 0; x < newHeight; x++) {
        let row = [];
        for (let y = 0; y < newWidth; y++)
            row.push(organisedPixels[Math.floor(x / scale)][Math.floor(y / scale)]);
        resizedPixels.push(row);
    }

    return { resizedPixels, newWidth, newHeight };
}

function handleFileUpload(files)
{
    const file = files[0];
    if (!(file && file.type.startsWith('image/'))) {
        console.warn("Fichier non valide ou pas une image.");
    }

    const fileReader = new FileReader();

    fileReader.onload = function(event) {
        const image = new Image();
        image.onload = function() {
            const canvas = document.getElementById('canvasOriginal');
            const ctx = canvas.getContext('2d');

            canvas.width = image.width;
            canvas.height = image.height;

            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const pixels = imageData.data;

            const nbColors = parseFloat(document.getElementById('colorInput').value);
            const scalePercent = parseFloat(document.getElementById('scaleInput').value);
            const scale = 1 - (scalePercent / 100);

            compressImage(pixels, image.width, image.height, scale, nbColors);
        };
        image.src = event.target.result;
    };

    fileReader.readAsDataURL(file);
}
