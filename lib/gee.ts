import { promises as fs } from 'fs';
import path from 'path';

// This function securely retrieves the GEE private key.
// It first tries to read from an environment variable (recommended for production).
// If not found, it falls back to reading from a JSON file in the project root.
export async function getPrivateKey() {
    if (process.env.GEE_PRIVATE_KEY_JSON) {
        try {
            // Parse the key from the environment variable
            return JSON.parse(process.env.GEE_PRIVATE_KEY_JSON);
        } catch (e) {
            console.error("Failed to parse GEE_PRIVATE_KEY_JSON from environment variable.");
            throw new Error("Invalid GEE private key format in environment variable.");
        }
    } else {
        // Fallback for local development: read from a file
        // Ensure 'private-key.json' is in your .gitignore file!
        try {
            const keyPath = path.join(process.cwd(), 'private-key.json');
            const keyFile = await fs.readFile(keyPath, 'utf8');
            return JSON.parse(keyFile);
        } catch (e) {
            console.error("Could not find or parse 'private-key.json'.");
            throw new Error("GEE private key not found. Please set GEE_PRIVATE_KEY_JSON environment variable or place 'private-key.json' in the project root.");
        }
    }
}
