import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

export const generateSigner = (privateStr: string) =>
  Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateStr).secretKey);
