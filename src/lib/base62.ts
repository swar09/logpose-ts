import base62 from "base62";
import { DatabaseId } from "../models/urls";
import { FF1 } from "ff1-js";
import de from "zod/v4/locales/de.cjs";

// allowed chars in resposnse of FPE , FF1 
const alphabet = "0123456789";
// TODO : Set custom radix , maxLength, minLength
const radix: number = 10;
// sample key 
const key = Buffer.from("111111111111111111111111111111111");
// no tweaks
const tweak = Buffer.from("");
// temp client 
const fpeClient = new FF1(key, tweak, radix, alphabet,);

export function encode(fpeClient: FF1, dbId: DatabaseId): string {
    const obuscatedId = obuscate(fpeClient, dbId);
    const encoded = base62.encode(dbId);
    return encoded;
}
export function decode(fpeClient: FF1, shortCode: string): DatabaseId {
    const decoded = base62.decode(shortCode);
    const databaseId = deObuscate(fpeClient, decoded);
    return databaseId;
}

function obuscate(fpeClient: FF1, dbId: DatabaseId): number {
    const encrypted = fpeClient.encrypt(String(dbId));
    return Number(encrypted);
}
function deObuscate(fpeClient: FF1, obuscatedId: number): number {
    const decrypted = fpeClient.decrypt(String(obuscatedId));
    return Number(decrypted);
}

