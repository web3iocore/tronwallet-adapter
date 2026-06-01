import {
    Adapter,
    WalletReadyState,
    WalletNotFoundError,
    WalletConnectionError,
    WalletDisconnectedError,
} from '@tronweb3/abstract-adapter-evm';
import { isInBrowser } from '@tronweb3/abstract-adapter-evm';
import type { LedgerUtils, LedgerWalletConfig } from './LedgerWallet.js';
import { LedgerWallet } from './LedgerWallet.js';
import { METADATA } from './metadata.js';

export interface LedgerEvmAdapterOptions {
    /**
     * Path used to derive the wallet address.
     * Default is: `m/44'/60'/0'/0/0`
     */
    path?: string;
}

export type LedgerAdapterConfig = LedgerWalletConfig;

const isSupportedLedger = () => !!(globalThis.navigator && (globalThis.navigator as any).hid);

export class LedgerEvmAdapter extends Adapter {
    name = METADATA.name;
    icon = METADATA.icon;
    url = METADATA.url;
    readyState: WalletReadyState = WalletReadyState.Loading;
    address: string | null = null;
    connecting = false;
    private config;
    private _chainId: `0x${string}` = '0x1';

    private _wallet: LedgerWallet;
    constructor(config: LedgerAdapterConfig = {}) {
        super();
        this.connecting = false;
        this.address = null;
        this.config = config;
        this._wallet = new LedgerWallet(config);
        if (isSupportedLedger()) {
            this.readyState = WalletReadyState.Found;
        } else {
            this.readyState = WalletReadyState.NotFound;
        }
    }

    get connected(): boolean {
        return !!this.address;
    }

    get ledgerUtils(): LedgerUtils {
        return {
            getAccounts: this._wallet.getAccounts,
            getAddress: this._wallet.getAddress,
        };
    }

    async getProvider(): Promise<any> {
        // For Ledger EVM adapter, we don't provide a standard EIP1193 provider
        // The signing operations are handled through the adapter methods
        return null;
    }

    async connect(): Promise<string> {
        try {
            if (this.connected || this.connecting) {
                return this.address || '';
            }
            if (this.readyState === WalletReadyState.NotFound) {
                if (this.config.openUrlWhenWalletNotFound !== false && isInBrowser()) {
                    window.open(this.url, '_blank');
                }
                throw new WalletNotFoundError();
            }
            this.connecting = true;
            try {
                await this._wallet.connect();
            } catch (e: any) {
                throw new WalletConnectionError(`${e.message}.`);
            }
            this.address = this._wallet.address;
            this.connecting = false;
            this.emit('connect', { chainId: this._chainId });
            return this.address || '';
        } catch (error: any) {
            this.connecting = false;
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.connected) {
            return;
        }
        this._wallet.disconnect();
        this.address = null;
        const error: any = new Error('Wallet disconnected');
        error.code = 4900;
        this.emit('disconnect', error);
    }

    async signMessage({ message }: { message: string; address?: string }): Promise<string> {
        if (!this.connected) {
            throw new WalletDisconnectedError();
        }
        try {
            return await this._wallet.signPersonalMessage(message);
        } catch (error: any) {
            throw new WalletConnectionError(error?.message);
        }
    }

    async signTypedData({
        typedData,
    }: {
        account?: string;
        typedData: {
            domain?: {
                chainId?: number;
                name?: string;
                verifyingContract?: string;
                version?: string;
            };
            types: {
                [key: string]: Array<{ name: string; type: string }>;
            };
            primaryType: string;
            message: Record<string, any>;
        };
    }): Promise<string> {
        if (!this.connected) {
            throw new WalletDisconnectedError();
        }
        try {
            return await this._wallet.signTypedData(typedData);
        } catch (error: any) {
            throw new WalletConnectionError(error?.message);
        }
    }

    async network(): Promise<string> {
        return this._chainId;
    }

    async switchChain(chainId: `0x${string}`): Promise<null> {
        this._chainId = chainId;
        this.emit('chainChanged', chainId);
        return null;
    }

    async sendTransaction(): Promise<string> {
        // Ledger adapter doesn't directly send transactions
        // Use signTransaction to sign, then send via provider
        throw new Error('Use signTransaction to sign the transaction first');
    }
}
