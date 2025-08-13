// utils/generateRandomSKU.js

/**
 * Generate a random SKU (Stock Keeping Unit) code
 * Format: ABC-1234-XYZ or similar
 * You can customize the length/pattern easily
 */
const generateRandomSKU = () => {
    const randomLetters = (length = 3) =>
        Array.from({ length }, () =>
            String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
        ).join('');

    const randomNumbers = (length = 4) =>
        Math.floor(Math.random() * Math.pow(10, length))
            .toString()
            .padStart(length, '0');

    return `${randomLetters()}-${randomNumbers()}-${randomLetters()}`;
};

export default generateRandomSKU;