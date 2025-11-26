// Base62 characters: 0-9, A-Z, a-z
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Converts a BigInt to a Base62 string
 */
function toBase62(num: bigint): string {
  if (num === 0n) return '0'
  
  let result = ''
  const base = BigInt(BASE62_CHARS.length)
  
  while (num > 0n) {
    result = BASE62_CHARS[Number(num % base)] + result
    num = num / base
  }
  
  return result
}

/**
 * Generates a random 64-bit ID as a Base62 string
 * Example output: "39eWdE8hZJ"
 */
export function generateId(): string {
  // Generate a random 64-bit number using crypto API
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  
  // Convert to BigInt (64-bit)
  let num = 0n
  for (let i = 0; i < 8; i++) {
    num = (num << 8n) | BigInt(array[i])
  }
  
  return toBase62(num)
}

